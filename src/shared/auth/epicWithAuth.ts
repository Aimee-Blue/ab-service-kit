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
import { IncomingMessage } from 'http';
import { Auth, Apps } from '@aimee-blue/ab-contracts';
import { IJwt, decodeJwt } from '@aimee-blue/ab-auth';

import { ISocketEpicAttributes } from '../kit';
import { ofType } from '../ofType';
import { verifyToken } from './verifyToken';
import { IAction } from '../action';
import { publishStream } from '../publishStream';
import { Utils, Errors } from '@aimee-blue/ab-shared';

export interface IInjectedAuthDetails {
  id: string;
  auth?: IJwt;
}

export interface ISocketEpicWithAuth<I, O = unknown, D = unknown>
  extends ISocketEpicAttributes<O> {
  (
    commands: Observable<I>,
    request: IncomingMessage & IInjectedAuthDetails,
    binary: Observable<Buffer>,
    deps?: D
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
              if (typeof result === 'object' && result.status === 200) {
                const decoded = deps.decodeJwt(auth.payload.token);
                return of(decoded.payload);
              } else {
                throw new Error(
                  `verifyAuth succeeded with non-ok status ${result.status} - ${result.message}`
                );
              }
            })
          )
      )
    );
}

export function epicWithAuth<E extends ISocketEpicWithAuth<unknown>>(
  allow: Auth.Role[],
  epic: E,
  deps = defaultDeps
) {
  const authForEpic = Utils.setFunctionName(
    `withAuth.${epic.name}`,
    (...args: Parameters<E>) => {
      const [cmd, req, binary, ...rest] = args;

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
              console.log(
                'Verify token failed:',
                Errors.ensureError(err).message,
                (req.id && `for ${req.id}`) || ''
              );

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
                args[1].auth = auth;
                return epic(
                  concat(from(buffered), commands),
                  req,
                  binary,
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
