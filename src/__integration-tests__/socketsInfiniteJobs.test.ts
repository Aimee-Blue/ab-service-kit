import WebSocket from 'ws';
import { fromEvent, merge, of, bindNodeCallback, NEVER, from } from 'rxjs';
import { mergeMap, take, timeoutWith, mapTo, map } from 'rxjs/operators';
import { PromiseType } from 'utility-types';

import { SocketEpic, SOCKET_CLOSE_WAIT_TIMEOUT } from '../shared';
import { initTestEpic } from './helpers';

jest.setTimeout(10000);

describe('given service with a faulty epic that never finishes tasks', () => {
  const epicThatNeverFinishes: SocketEpic = (commands) =>
    merge(commands, NEVER);

  let data: PromiseType<ReturnType<typeof initTestEpic>>;
  beforeEach(async () => {
    data = await initTestEpic(epicThatNeverFinishes);
  });

  it('should teardown within 7.5 seconds', async () => {
    const socket = new WebSocket('ws://localhost:8080/events');

    const onOpen = fromEvent(socket, 'open');
    const onError = fromEvent(socket, 'error').pipe(
      mergeMap((event: { error: Error }) => {
        return Promise.reject(event.error);
      })
    );
    const onMessage = fromEvent(socket, 'message').pipe(
      map((event: { data: string }) => JSON.parse(event.data) as {})
    );

    const connected = await merge(onOpen, onError)
      .pipe(mapTo('connected'), timeoutWith(1000, of('timed-out')), take(1))
      .toPromise();

    expect(connected).toBe('connected');
    expect(socket.readyState).toBe(WebSocket.OPEN);

    const send = bindNodeCallback(socket.send.bind(socket));

    await send(JSON.stringify({ type: 'MESSAGE' })).toPromise();

    // wait to receive message back
    await onMessage.pipe(take(1)).toPromise();

    // terminate the connection earlier from client side
    socket.terminate();

    const teardownResult = await from(data.teardown())
      .pipe(
        mapTo('done'),
        timeoutWith(SOCKET_CLOSE_WAIT_TIMEOUT + 1000, of('timeout'))
      )
      .toPromise();

    // we should teardown within 6s because the wait timeout is 5s
    expect(teardownResult).toBe('done');
  });
});
