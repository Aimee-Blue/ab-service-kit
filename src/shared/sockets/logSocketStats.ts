import WebSocket from 'ws';
import { Observable, combineLatest } from 'rxjs';
import {
  filter,
  ignoreElements,
  scan,
  map,
  startWith,
  tap,
  auditTime,
  finalize,
} from 'rxjs/operators';
import { EOL } from 'os';
import { localNow } from '../time';

export function logSocketStats(data: Observable<WebSocket.Data>, id: string) {
  const numberOfMessages = data.pipe(
    filter(item => typeof item === 'object' || typeof item === 'string'),
    map((_, i) => i + 1)
  );
  const bytesReceived = data.pipe(
    filter(item => item instanceof Buffer),
    scan((sum, item: Buffer) => item.byteLength + sum, 0)
  );

  const log = ([msgs, bytes]: [number, number]) => {
    console.log(
      `${EOL}🔃  Connection stats`,
      {
        id,
        bytesReceived: bytes,
        numberOfMessages: msgs,
        timestamp: localNow(),
      },
      EOL
    );
  };

  let latestState = [0, 0] as [number, number];
  const stats = combineLatest(
    numberOfMessages.pipe(startWith(0)),
    bytesReceived.pipe(startWith(0))
  ).pipe(
    tap(value => {
      latestState = value;
    }),
    auditTime(5000),
    tap(log),
    finalize(() => {
      log(latestState);
    }),
    ignoreElements()
  );

  return stats;
}
