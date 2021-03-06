import {
  take,
  concatMap,
  catchError,
  switchMap,
  ignoreElements,
  map,
  withLatestFrom,
  buffer,
  skip,
} from 'rxjs/operators';
import {
  Observable,
  from,
  of,
  merge,
  empty,
  concat,
  ObservedValueOf,
} from 'rxjs';
import { Auth, Apps } from '@aimee-blue/ab-contracts';
import { IJwt, decodeJwt } from '@aimee-blue/ab-auth';

import { ISocketEpicAttributes, ISocketEpicContext } from '../kit';
import { ofType } from '../ofType';
import { verifyToken } from './verifyToken';
import { IAction } from '../action';
import { publishStream } from '../publishStream';
import { Utils, Errors } from '@aimee-blue/ab-shared';
import { VerifyError } from './verifyError';
import { registerError } from '../registerError';

export interface IInjectedAuthDetails {
  id: string;
  auth?: IJwt;
}

export interface ISocketEpicWithAuth<
  I extends IAction = IAction,
  O extends IAction | Buffer = IAction | Buffer,
  D = {},
  R extends unknown[] = unknown[]
> extends ISocketEpicAttributes<O, D> {
  (
    commands: Observable<IAction | I>,
    ctx: ISocketEpicContext & IInjectedAuthDetails & D,
    ...rest: R
  ): Observable<O>;
}

const defaultDeps = {
  verifyToken: (...args: Parameters<typeof verifyToken>) =>
    from(verifyToken(...args)),
  decodeJwt,
};

function firstMessageShouldBeAuth() {
  return (commands: Observable<IAction>) =>
    commands.pipe(
      take(1),
      map((msg: IAction) => {
        if (msg.type !== Auth.AUTH) {
          throw new Error('No token received');
        }
        return msg;
      }),
      ofType<Auth.IAuthAction>(Auth.AUTH)
    );
}

const VERIFY_TOKEN_REQUEST_SUCCESS_PREFIX =
  'verifyAuth succeeded with non-ok status';

function verifyTokensUsingAuthMessage(
  allow: Auth.Role[],
  deps: typeof defaultDeps
) {
  return (commands: Observable<Auth.IAuthAction>) =>
    commands.pipe(
      concatMap(auth =>
        deps
          .verifyToken({
            token: auth.payload.token,
            allow,
          })
          .pipe(
            switchMap(result => {
              const decoded = deps.decodeJwt(auth.payload.token);
              if (
                typeof result === 'object' &&
                result !== null &&
                result.status === 200
              ) {
                return of(decoded.payload);
              } else {
                throw new VerifyError(
                  `${VERIFY_TOKEN_REQUEST_SUCCESS_PREFIX} ${result.status} - ${result.message}`,
                  decoded
                );
              }
            })
          )
      )
    );
}

export function epicWithAuth<E extends ISocketEpicWithAuth>(
  allow: Auth.Role[],
  epic: E,
  deps = defaultDeps
) {
  const authForEpic = Utils.setFunctionName(
    `withAuth.${epic.name}`,
    (...[cmd, ctx, ...rest]: Parameters<E>) => {
      return new Observable<Apps.IErrorAction | ObservedValueOf<ReturnType<E>>>(
        subscriber => {
          const commands = publishStream(cmd);
          const authOp = publishStream(
            commands.pipe(
              firstMessageShouldBeAuth(),
              verifyTokensUsingAuthMessage(allow, deps)
            )
          );

          const authSuccessOrEmpty = authOp.pipe(catchError(() => empty()));

          const authFailed = authOp.pipe(
            ignoreElements(),
            catchError(err => {
              const error = Errors.ensureError(err);
              if (error instanceof VerifyError) {
                const payload = error.token?.payload as
                  | {
                      isConsole?: boolean;
                      isHil?: boolean;
                    }
                  | undefined;
                if (payload && payload.isConsole && !payload.isHil) {
                  registerError(error);
                  ctx.logger.error(
                    '💥  Console user authentication failed: ',
                    error
                  );
                } else {
                  // probably just a sleeping HIL tab:
                  ctx.logger.log(error.message);
                }
              } else {
                ctx.logger.error('💥  Verify token request failed: ', error);
              }

              const appError: Apps.IErrorAction = {
                type: Apps.ERROR,
                payload: {
                  status: 'UNAUTHENTICATED',
                  message: 'Unauthenticated',
                },
              };

              return of(appError);
            })
          );

          const result = merge(
            authFailed,
            authSuccessOrEmpty.pipe(
              // buffer commands while authOp is in progress:
              withLatestFrom(
                commands.pipe(
                  skip(1),
                  buffer(authSuccessOrEmpty.pipe(take(1))),
                  take(1)
                )
              ),
              switchMap(([auth, buffered]) => {
                ctx.auth = auth;
                return epic(
                  concat(from(buffered), commands),
                  ctx,
                  ...rest
                ) as ReturnType<E>;
              })
            )
          );

          subscriber.add(result.subscribe(subscriber));
          subscriber.add(authOp.connect());
          subscriber.add(commands.connect());
        }
      );
    }
  );

  return authForEpic;
}
