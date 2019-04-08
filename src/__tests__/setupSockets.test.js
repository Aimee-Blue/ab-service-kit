import { socketHandlerBuilder } from '../setup/sockets';
import { marbles } from 'rxjs-marbles/jest';
import { takeUntil, filter, map } from 'rxjs/operators';
import { EventEmitter } from 'events';
import { publishStream } from '../shared';

function buildDeps(incoming) {
  const dataStreamFromSocket = () => incoming;

  const deps = {
    dataStreamFromSocket,
    pipeStreamIntoSocket: jest.fn(),
    actionStreamFromSocket: stream => stream,
    binaryStreamFromSocket: stream => stream,
  };

  return deps;
}

function resultStream({ pipelines, incoming }) {
  const deps = buildDeps(incoming);

  const handler = socketHandlerBuilder(pipelines, deps);

  const socket = new EventEmitter();
  socket.close = jest.fn();

  handler(socket, {
    url: 'http://some-server.com/endpoint',
  });

  expect(deps.pipeStreamIntoSocket).toBeCalledTimes(1);

  const result = deps.pipeStreamIntoSocket.mock.calls[0][0];

  return result;
}

describe('given an echoing pipeline', () => {
  const echoEpic = commands => {
    return commands.pipe(map(x => x));
  };

  const pipelines = new Map();
  pipelines.set('/endpoint', echoEpic);

  describe('when closed on client side', () => {
    it(
      'should work',
      marbles(m => {
        const incoming = m.hot('a|'); // prettier-ignore
        const subscriptions =  '^!'; // prettier-ignore
        const expected =       'a|'; // prettier-ignore

        const result = resultStream({ incoming, pipelines });

        m.expect(result).toBeObservable(expected);
        m.expect(incoming).toHaveSubscriptions(subscriptions);
      })
    );
  });

  describe('when never closed on client side', () => {
    it(
      'should work',
      marbles(m => {
        const incoming = m.hot('a---'); // prettier-ignore
        const subscriptions =  '^---'; // prettier-ignore
        const expected =       'a---'; // prettier-ignore

        const result = resultStream({ incoming, pipelines });

        m.expect(result).toBeObservable(expected);
        m.expect(incoming).toHaveSubscriptions(subscriptions);
      })
    );
  });

  describe('when no data on client side', () => {
    it(
      'should work',
      marbles(m => {
        const incoming = m.hot('----'); // prettier-ignore
        const subscriptions =  '^---'; // prettier-ignore
        const expected =       '----'; // prettier-ignore

        const result = resultStream({ incoming, pipelines });

        m.expect(result).toBeObservable(expected);
        m.expect(incoming).toHaveSubscriptions(subscriptions);
      })
    );
  });
});

describe('given a terminatable pipeline', () => {
  /**
   * @param {import('rxjs').Observable<string>} commands
   */
  const terminatableEchoEpic = commands => {
    return commands.pipe(
      //
      takeUntil(
        commands.pipe(
          //
          filter(cmd => cmd === 't')
        )
      )
    );
  };

  const pipelines = new Map();
  pipelines.set('/endpoint', terminatableEchoEpic);

  describe('when closed on server side', () => {
    it(
      'should work',
      marbles(m => {
        const incoming = m.hot('a--t--|'); // prettier-ignore
        const subscriptions =  '^--!'; // prettier-ignore
        const expected =       'a--|'; // prettier-ignore

        const result = resultStream({ incoming, pipelines });

        m.expect(result).toBeObservable(expected);
        m.expect(incoming).toHaveSubscriptions(subscriptions);
      })
    );
  });
});
