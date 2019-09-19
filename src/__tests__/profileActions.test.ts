import { marbles } from 'rxjs-marbles/jest';
import { profileActions } from '../shared';

describe(profileActions.name, () => {
  describe('given default parameters', () => {
    const deps = {
      profilerLog: jest.fn(),
    };

    const map = {
      a: {
        type: 'event',
        payload: 'value',
      },
    };

    it(
      'should work',
      marbles(m => {
        const source = m.hot('aaa|', map); // prettier-ignore
        const subs =         '^--!'; // prettier-ignore
        const expected =     'aaa|'; // prettier-ignore

        const result = source.pipe(profileActions(undefined, deps));

        m.expect(result).toBeObservable(expected, map);
        m.expect(source).toHaveSubscriptions(subs);
        m.flush();

        expect(deps.profilerLog).toHaveBeenCalledTimes(3);
        expect(deps.profilerLog).toHaveBeenNthCalledWith(1, {
          event: map.a.type,
          data: map.a,
        });
      })
    );
  });
});
