import WebSocket from 'ws';
import { Observable, empty, timer } from 'rxjs';
import {
  concatMap,
  ignoreElements,
  switchMap,
  take,
  takeUntil,
} from 'rxjs/operators';
import { whenCompleted } from '../whenCompleted';

export function logWarningIfOutgoingStreamNotComplete(
  data: Observable<WebSocket.Data>,
  outgoing: Observable<unknown>,
  timeout: number,
  id: string
) {
  const incomingCompleted = data.pipe(whenCompleted());
  const outgoingCompleted = outgoing.pipe(whenCompleted());

  const log = incomingCompleted.pipe(
    take(1),
    concatMap(() =>
      timer(timeout).pipe(
        switchMap(() => {
          console.warn(
            `🚨  Epic stream for connection with id ${id} did not complete ${(
              timeout / 1000
            ).toFixed(2)} seconds after the socket closure. Is something wrong?`
          );
          return empty();
        }),
        takeUntil(outgoingCompleted)
      )
    ),
    ignoreElements()
  );

  return log;
}
