import { marbles, Context } from 'rxjs-marbles/jest';
import { ISocketEpic } from 'src/shared/kit';
import { epicWithAuth } from '../epicWithAuth';
import { Auth, Apps } from '@aimee-blue/ab-contracts';
import { empty, of } from 'rxjs';
import { take } from 'rxjs/operators';

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
  const req = {};

  const echoingEpicImpl: ISocketEpic<{}> = (commands, _req, _binary) =>
    commands;
  const echoingEpic = jest.fn(echoingEpicImpl);

  // tslint:disable-next-line
  const epic = epicWithAuth([], echoingEpic as any, {
    verifyToken: jest.fn(data =>
      data.token === 'TOKEN'
        ? of({ status: 200, message: 'Ok' })
        : of({ status: 400, message: 'Oops!' })
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

  // tslint:disable-next-line
  const output = epic(input, req as any, empty(), {}).pipe(take(10));

  return {
    input,
    output,
    originalEpic: echoingEpic,
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
    const inputCmds = 'ad|';
    const outputCmds = '-d|';

    it(
      'should complete',
      marbles(m => {
        const { output, originalEpic } = buildTestData(inputCmds, m);

        m.expect(output).toBeObservable(outputCmds, possibleOutput);
        m.flush();

        expect(originalEpic.mock.calls.length).toBe(1);
        expect(originalEpic.mock.calls[0][1]).toEqual({
          auth: {
            decodedToken: 'decodedToken',
          },
        });
      })
    );
  });
});
