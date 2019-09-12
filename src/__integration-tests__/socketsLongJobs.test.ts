import WebSocket from 'ws';
import { fromEvent, merge, of, bindNodeCallback, timer, defer } from 'rxjs';
import {
  mergeMap,
  take,
  timeoutWith,
  mapTo,
  ignoreElements,
  tap,
  finalize,
  publish,
} from 'rxjs/operators';
import { PromiseType } from 'utility-types';

import { SocketEpic } from '../shared';
import { initTestEpic } from './helpers';

describe('given service with long running tasks', () => {
  const TASK_TIME = 1000;

  const longRunningTaskState = {
    subscribed: false,
    complete: false,
    unsubscribed: false,
  };

  const echoingEpicWithLongRunningInnerObservable: SocketEpic<
    unknown
  > = commands =>
    commands.pipe(
      publish(cmd =>
        merge(
          cmd,
          defer(() => {
            longRunningTaskState.subscribed = true;
            return timer(TASK_TIME).pipe(
              tap(() => {
                longRunningTaskState.complete = true;
              }),
              finalize(() => {
                longRunningTaskState.unsubscribed = true;
              }),
              ignoreElements()
            );
          })
        )
      )
    );

  let data: PromiseType<ReturnType<typeof initTestEpic>>;
  beforeEach(async () => {
    data = await initTestEpic(echoingEpicWithLongRunningInnerObservable, {
      // We can diagnose our unit test here:
      // spy: async spy => {
      //   spy.log(/debug.*/);
      // },
    });
  });

  afterEach(async () => {
    await data.teardown();
  });

  it('should allow observables to complete', async () => {
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

    const send = bindNodeCallback(socket.send.bind(socket));

    await send(JSON.stringify({ type: 'MESSAGE' })).toPromise();

    // terminate the connection earlier:
    socket.terminate();

    // now there is no other way to check the state but
    // to wait for the state to be updated
    await timer(TASK_TIME + 100)
      .pipe(mapTo('done'))
      .toPromise();

    expect(longRunningTaskState).toEqual({
      subscribed: true,
      unsubscribed: true,
      complete: true,
    });
  });
});
