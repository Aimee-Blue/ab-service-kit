import WebSocket from 'ws';
import { fromEvent, merge, of, bindNodeCallback } from 'rxjs';
import { mergeMap, take, timeoutWith, mapTo, map } from 'rxjs/operators';
import { PromiseType } from 'utility-types';

import { SocketEpic } from '../shared';
import { initTestEpic } from './helpers';

describe('given service with echo pipeline', () => {
  const echoingEpic: SocketEpic<unknown> = commands => commands;

  let data: PromiseType<ReturnType<typeof initTestEpic>>;
  beforeEach(async () => {
    data = await initTestEpic(echoingEpic);
  });

  afterEach(async () => {
    await data.teardown();
  });

  it('should allow connection', async () => {
    const socket = new WebSocket('ws://localhost:8080/events');

    const onOpen = fromEvent(socket, 'open');
    const onError = fromEvent(socket, 'error').pipe(
      mergeMap((event: { error: Error }) => {
        return Promise.reject(event.error);
      })
    );

    const connected = await merge(onOpen, onError)
      .pipe(
        mapTo('connected'),
        timeoutWith(1000, of('timed-out')),
        take(1)
      )
      .toPromise();

    expect(connected).toBe('connected');
    expect(socket.readyState).toBe(WebSocket.OPEN);

    expect(data.handler.mock.calls.length).toBe(1);
  });

  it('should pass data', async () => {
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
      .pipe(
        mapTo('connected'),
        timeoutWith(1000, of('timed-out')),
        take(1)
      )
      .toPromise();

    expect(connected).toBe('connected');
    expect(socket.readyState).toBe(WebSocket.OPEN);

    const send = bindNodeCallback(socket.send.bind(socket));

    await send(JSON.stringify({ type: 'MESSAGE' })).toPromise();
    const received = await onMessage.pipe(take(1)).toPromise();

    expect(received).toEqual({ type: 'MESSAGE' });
  });
});
