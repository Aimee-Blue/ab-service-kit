import { marbles, Context } from 'rxjs-marbles/jest';
import { epicWithAuth } from '../epicWithAuth';
import { Auth, Apps } from '@aimee-blue/ab-contracts';
import { timer } from 'rxjs';
import { take, mapTo } from 'rxjs/operators';
import { SocketEpic } from '../../kit';
import { createNoOpLogger } from '../../logging';

const possibleInput = {
  a: Auth.auth({
    token: 'TOKEN',
  }),
  d: {
    type: 'DUMMY',
    payload: 'not-important',
  },
};

const possibleOutput = {
  U: {
    type: Apps.ERROR,
    payload: {
      status: 'UNAUTHENTICATED',
      message: 'Unauthenticated',
    },
  },
  d: {
    type: 'DUMMY',
    payload: 'not-important',
  },
};

function buildTestData(inputCmds: string, m: Context) {
  const echoingEpicImpl: SocketEpic = commands => commands;
  const echoingEpic = jest.fn(echoingEpicImpl);

  // tslint:disable-next-line
  const epic = epicWithAuth([], echoingEpic as any, {
    verifyToken: jest.fn(data =>
      data.token === 'TOKEN'
        ? timer(1, m.scheduler).pipe(mapTo({ status: 200, message: 'Ok' }))
        : timer(1, m.scheduler).pipe(mapTo({ status: 400, message: 'Oops!' }))
    ),
    decodeJwt: jest.fn(() => ({
      header: {},
      payload: {
        decodedToken: 'decodedToken',
      },
      signature: '',
    })),
  });

  const input = m.hot(inputCmds, possibleInput);

  const logger = createNoOpLogger();
  const context = {
    logger,
  };

  // tslint:disable-next-line
  const output = epic(input, context).pipe(take(10));

  return {
    input,
    output,
    originalEpic: echoingEpic,
    context,
  };
}

describe(epicWithAuth.name, () => {
  describe('given no token sent', () => {
    const inputCmds = 'd';
    const outputCmds = '(U|)';

    it(
      'should complete with error',
      marbles(m => {
        const { output } = buildTestData(inputCmds, m);

        m.expect(output).toBeObservable(outputCmds, possibleOutput);
      })
    );
  });

  describe('given completed before token sent', () => {
    const inputCmds = '|';
    const outputCmds = '|';

    it(
      'should complete',
      marbles(m => {
        const { output } = buildTestData(inputCmds, m);

        m.expect(output).toBeObservable(outputCmds, possibleOutput);
      })
    );
  });

  describe('given token and then another command', () => {
    const inputCmds = 'adddd|';
    const outputCmd = '-dddd|';
    const inputSubs = '^----!';

    it(
      'should complete',
      marbles(m => {
        const { input, output, originalEpic, context } = buildTestData(
          inputCmds,
          m
        );

        m.expect(input).toHaveSubscriptions([inputSubs]);
        m.expect(output).toBeObservable(outputCmd, possibleOutput);
        m.flush();

        expect(originalEpic.mock.calls.length).toBe(1);
        expect(originalEpic.mock.calls[0][1]).toEqual({
          ...context,
          auth: {
            decodedToken: 'decodedToken',
          },
        });
      })
    );
  });
});
