import { defer, SchedulerLike, from, Observable, timer } from 'rxjs';
import { signJwtUsingServiceAccountKey } from '@aimee-blue/ab-auth';
import { switchMap, map, take, shareReplay, exhaustMap } from 'rxjs/operators';

interface ITokenWithExp {
  keyId: string;
  signedJwt: string;
  expiresAtMillis: number;
}

export function createSelfSignedTokens(
  params: {
    expireInMillis: number;
    rollNewTokenInMillis: number;
    scheduler?: SchedulerLike;
  },
  deps = {
    now: () => from(Promise.resolve(Date.now())),
    signJwt: (...args: Parameters<typeof signJwtUsingServiceAccountKey>) =>
      from(signJwtUsingServiceAccountKey(...args)),
  }
): Observable<ITokenWithExp> {
  const nextJwt = defer(() =>
    deps.now().pipe(
      take(1),
      switchMap(now => {
        const iat = now / 1000;
        const exp = iat + params.expireInMillis / 1000;

        return deps
          .signJwt({
            aud: 'https://aimeeblue.com/functions',
            iat,
            exp,
          })
          .pipe(
            take(1),
            map(result => ({
              ...result,
              expiresAtMillis: now + params.expireInMillis,
            }))
          );
      })
    )
  );

  return timer(0, params.rollNewTokenInMillis, params.scheduler).pipe(
    exhaustMap(() => nextJwt),
    shareReplay({
      bufferSize: 1,
      refCount: true,
      windowTime: params.rollNewTokenInMillis,
      scheduler: params.scheduler,
    })
  );
}

function buildSelfSignedTokensLazy() {
  let tokensStream: ReturnType<typeof createSelfSignedTokens> | null = null;
  return () => {
    if (tokensStream) {
      return tokensStream;
    }
    return (tokensStream = createSelfSignedTokens({
      expireInMillis: 3600 * 1000,
      rollNewTokenInMillis: 3000 * 1000,
    }));
  };
}

export const selfSignedTokens = buildSelfSignedTokensLazy();

export async function currentSelfSignedToken(): Promise<string> {
  const result = await selfSignedTokens()
    .pipe(take(1))
    .toPromise();
  return result.signedJwt;
}
