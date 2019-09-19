import {
  take,
  concatMap,
  catchError,
  switchMap,
  publish,
  ignoreElements,
  map,
  share,
} from 'rxjs/operators';
import { Observable, from, of, merge, empty } from 'rxjs';
import { IncomingMessage } from 'http';
import { Auth, Apps } from '@aimee-blue/ab-contracts';
import { IJwt, decodeJwt } from '@aimee-blue/ab-auth';

import { ISocketEpicAttributes } from '../kit';
import { ofType } from '../ofType';
import { verifyToken } from './verifyToken';
import { IAction } from '../action';

export interface IInjectedAuthDetails {
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
  const authForEpic = (...args: Parameters<E>) => {
    const sharedCommands = args[0].pipe(share());

    const authCmd = sharedCommands.pipe(
      //
      firstMessageShouldBeAuth()
    );

    const verifyAuth = authCmd.pipe(
      //
      verifyTokensUsingAuthMessage(allow, deps)
    );

    return verifyAuth.pipe(
      publish(shared =>
        merge(
          shared.pipe(
            catchError(() => empty()),
            switchMap(auth => {
              args[1].auth = auth;
              return epic(
                sharedCommands,
                args[1],
                args[2],
                args[3]
              ) as ReturnType<E>;
            })
          ),
          shared.pipe(
            ignoreElements(),
            catchError(err => {
              console.error('💥  Verify token failed', err);

              const appError: Apps.IErrorAction = {
                type: Apps.ERROR,
                payload: {
                  status: 'UNAUTHENTICATED',
                  message: 'Unauthenticated',
                },
              };

              return of(appError);
            })
          )
        )
      )
    );
  };

  return authForEpic;
}
