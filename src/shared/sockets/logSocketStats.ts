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
import { isString, isBuffer } from './helpers';

export function logSocketStats(data: Observable<WebSocket.Data>, id: string) {
  const numberOfMessages = data.pipe(
    filter(isString),
    map((_, i) => i + 1)
  );
  const bytesReceived = data.pipe(
    filter(isBuffer),
    scan((sum, item: Buffer) => item.byteLength + sum, 0)
  );

  const logMsg = (prefix: string) => ([msgs, bytes]: [number, number]) => {
    console.log(
      `${EOL}${prefix}`,
      {
        id,
        bytesReceived: bytes,
        numberOfMessages: msgs,
        timestamp: localNow(),
      },
      EOL
    );
  };

  const log = logMsg('🔃  Connection stats');
  const logFinal = logMsg('🔃  Connection stats upon closure');

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
      logFinal(latestState);
    }),
    ignoreElements()
  );

  return stats;
}
