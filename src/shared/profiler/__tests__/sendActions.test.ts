import { marbles } from 'rxjs-marbles/jest';
import { sendActions } from '../send';

describe('sendActions', () => {
  describe('given default parameters', () => {
    const deps = {
      sendOne: jest.fn(),
    };

    const map = {
      a: {
        type: 'event',
        payload: 'value',
      },
    };

    it(
      'should work',
      marbles((m) => {
        const source = m.hot('aaa|', map); // prettier-ignore
        const subs =         '^--!'; // prettier-ignore
        const expected =     'aaa|'; // prettier-ignore

        const result = source.pipe(sendActions(undefined, deps));

        m.expect(result).toBeObservable(expected, map);
        m.expect(source).toHaveSubscriptions(subs);
        m.flush();

        expect(deps.sendOne).toHaveBeenCalledTimes(3);
        expect(deps.sendOne).toHaveBeenNthCalledWith(1, {
          event: map.a.type,
          data: map.a,
        });
      })
    );
  });
});
