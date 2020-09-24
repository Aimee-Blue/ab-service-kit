import { marbles } from 'rxjs-marbles/jest';
import { retryWithBackoff, RetryOpts, createNoOpBasicLogger } from '../shared';
import { take, tap } from 'rxjs/operators';

describe('retryWithBackoff', () => {
  describe('given default options', () => {
    const opts: RetryOpts = {
      shouldRetry: () => true,
      logger: createNoOpBasicLogger(),
    };

    describe('given source with no errors', () => {
      // eslint-disable-next-line
      it(
        'should work',
        marbles((m) => {
          const source = m.hot('aaa|'); // prettier-ignore
          const subs =         '^--!'; // prettier-ignore
          const expected =     'aaa|'; // prettier-ignore

          const result = source.pipe(retryWithBackoff(opts));

          m.expect(result).toBeObservable(expected);
          m.expect(source).toHaveSubscriptions(subs);
        })
      );
    });

    describe('given empty source', () => {
      // eslint-disable-next-line
      it(
        'should work',
        marbles((m) => {
          const source = m.hot('|'); // prettier-ignore
          const subs =         '(^!)'; // prettier-ignore
          const expected =     '|'; // prettier-ignore

          const result = source.pipe(retryWithBackoff(opts));

          m.expect(result).toBeObservable(expected);
          m.expect(source).toHaveSubscriptions(subs);
        })
      );
    });

    describe('given infinite source', () => {
      // eslint-disable-next-line
      it(
        'should work',
        marbles((m) => {
          const source = m.hot('---'); // prettier-ignore
          const subs =         '^--'; // prettier-ignore
          const expected =     '---'; // prettier-ignore

          const result = source.pipe(retryWithBackoff(opts));

          m.expect(result).toBeObservable(expected);
          m.expect(source).toHaveSubscriptions(subs);
        })
      );
    });

    describe('given source that errors', () => {
      // eslint-disable-next-line
      it(
        'should work',
        marbles((m) => {
          const source = m.cold('a-bc-#'); // prettier-ignore
          const subs = [ // prettier-ignore
                                '^----!', // prettier-ignore
                                '------ 1s ^--!', // prettier-ignore
          ]; // prettier-ignore
          const expected =      'a-bc-- 1s a-b(c|)'; // prettier-ignore

          const result = source.pipe(
            retryWithBackoff(opts),
            take(6) // <- stop the test after one retry
          );

          m.expect(result).toBeObservable(expected);
          m.expect(source).toHaveSubscriptions(subs);
        })
      );
    });

    describe('given source that errors twice after successful retry', () => {
      // eslint-disable-next-line
      it(
        'should work',
        marbles((m) => {
          const source = m.cold('a-bc-#'); // prettier-ignore
          const subs = [                                    // prettier-ignore
                                '^----!',                   // prettier-ignore
                                '------ 1s ^----!',         // prettier-ignore
                                '------ 1s ------ 1s ^--!', // prettier-ignore
          ]; // prettier-ignore
          const expected =      'a-bc-- 1s a-bc-- 1s a-b(c|)'; // prettier-ignore

          const result = source.pipe(
            retryWithBackoff(opts),
            take(9) // <- stop the test after two reties
          );

          m.expect(result).toBeObservable(expected);
          m.expect(source).toHaveSubscriptions(subs);
        })
      );
    });

    describe('given source that errors twice in a row', () => {
      // eslint-disable-next-line
      it(
        'should work',
        marbles((m) => {
          const source = m.hot('aX 1s -X-|'); // prettier-ignore
          const subs = [                            // prettier-ignore
                               '^!',                // prettier-ignore
                               '-- 1s ^!',          // prettier-ignore
                               '-- 1s - 10s -(^!)', // prettier-ignore
          ]; // prettier-ignore
          const expected =     'a- 1s - 10s -|'; // prettier-ignore

          const result = source.pipe(
            tap((item) => {
              if (item === 'X') {
                // eslint-disable-next-line no-throw-literal
                throw 'error';
              }
            }),
            retryWithBackoff(opts),
            take(5)
          );

          m.expect(result).toBeObservable(expected);
          m.expect(source).toHaveSubscriptions(subs);
        })
      );
    });
  });
});
