import { marbles } from 'rxjs-marbles/jest';
import { attach, timesRegistered, createState } from '../streams';
import { create } from 'rxjs-spy';

describe(`${attach.name} operator`, () => {
  function createSpy() {
    const spy = create();
    spy.log('debug');
    return () => {
      spy.teardown();
    };
  }

  const teardown = beforeAll(createSpy) as ReturnType<typeof createSpy>;

  afterAll(() => teardown());

  describe('given observable that fires every 2ms', () => {
    it(
      'should allow profiling time between emissions',
      marbles((m) => {
        const source = m.hot('a-b-c|'); // prettier-ignore
        const subs =         '^----!'; // prettier-ignore
        const expected =     'a-b-c|'; // prettier-ignore
        const times =        '--2-4'; // prettier-ignore

        const state = createState({
          timestamp: () => {
            return [m.scheduler.frame / 1000, 0];
          },
          timestampDiff: (timestamp: [number, number]) => {
            return [Math.round(m.scheduler.frame - timestamp[0]) / 1000, 0];
          },
        });

        const result = source.pipe(
          attach({
            from: 'next',
            till: 'next',
            name: 'between-emissions',
            state,
          })
        );

        const timings = timesRegistered('between-emissions');

        m.expect(result).toBeObservable(expected);
        m.expect(source).toHaveSubscriptions(subs);

        m.expect(timings).toBeObservable(times, {
          '2': {
            name: 'between-emissions',
            time: 2,
          },
          '4': {
            name: 'between-emissions',
            time: 4,
          },
        });
        m.flush();
      })
    );

    // eslint-disable-next-line
    it(
      'should allow profiling subscription time',
      marbles((m) => {
        const source = m.hot('a-b-c|'); // prettier-ignore
        const subs =         '^----!'; // prettier-ignore
        const expected =     'a-b-c|'; // prettier-ignore
        const times =        '-----5'; // prettier-ignore

        const state = createState({
          timestamp: () => {
            return [m.scheduler.frame / 1000, 0];
          },
          timestampDiff: (timestamp: [number, number]) => {
            return [Math.round(m.scheduler.frame - timestamp[0]) / 1000, 0];
          },
        });

        const result = source.pipe(
          attach({
            from: 'subscribe',
            till: 'unsubscribe',
            name: 'subscription-time',
            state,
          })
        );

        const timings = timesRegistered('subscription-time');

        m.expect(result).toBeObservable(expected);
        m.expect(source).toHaveSubscriptions(subs);

        m.expect(timings).toBeObservable(times, {
          '5': {
            name: 'subscription-time',
            time: 5,
          },
        });
        m.flush();
      })
    );

    // eslint-disable-next-line
    it(
      'should allow profiling completion time',
      marbles((m) => {
        const source = m.hot('a-b-c|-'); // prettier-ignore
        const subs =         '^----!-'; // prettier-ignore
        const expected =     'a-b-c|-'; // prettier-ignore
        const times =        '-----0-'; // prettier-ignore

        const state = createState({
          timestamp: () => {
            return [m.scheduler.frame / 1000, 0];
          },
          timestampDiff: (timestamp: [number, number]) => {
            return [Math.round(m.scheduler.frame / 1000 - timestamp[0]), 0];
          },
        });

        const result = source.pipe(
          attach({
            from: 'complete',
            till: 'unsubscribe',
            name: 'unsubscribe-time',
            state,
          })
        );

        const timings = timesRegistered('unsubscribe-time');

        m.expect(result).toBeObservable(expected);
        m.expect(source).toHaveSubscriptions(subs);

        m.expect(timings).toBeObservable(times, {
          '0': {
            name: 'unsubscribe-time',
            time: 0,
          },
        });
      })
    );
  });
});
