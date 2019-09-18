import { marbles } from 'rxjs-marbles/jest';
import { take, switchMap } from 'rxjs/operators';
import { createSelfSignedTokens } from '../selfSignedTokens';
import { of, timer } from 'rxjs';

describe(createSelfSignedTokens.name, () => {
  describe('given different tokens generated every time', () => {
    it(
      'should work',
      marbles(m => {
        const values = {
          a: {
            keyId: 'a',
            signedJwt: 'a',
          },
          b: {
            keyId: 'b',
            signedJwt: 'b',
          },
          c: {
            keyId: 'c',
            signedJwt: 'c',
          },
        };

        const results = {
          A: {
            keyId: 'a',
            signedJwt: 'a',
            expiresAtMillis: 6,
          },
          B: {
            keyId: 'a',
            signedJwt: 'a',
            expiresAtMillis: 5 + 6,
          },
        };

        const signs = m.cold('a', values);

        const result = createSelfSignedTokens(
          {
            expireInMillis: 6,
            rollNewTokenInMillis: 5,
            scheduler: m.scheduler,
          },
          {
            signJwt: () => signs,
            now: () => of(m.scheduler.frame),
          }
        );

        m.expect(result.pipe(take(2))).toBeObservable('A----(B|)', results);

        const steps = timer(0, 1, m.scheduler).pipe(
          switchMap(() => result.pipe(take(1))),
          take(6)
        );

        m.expect(steps).toBeObservable('AAAAA(B|)', results);
      })
    );
  });
});
