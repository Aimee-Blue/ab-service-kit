import WebSocket from 'ws';
import { Observable, combineLatest } from 'rxjs';
import { filter, ignoreElements, scan, map, startWith } from 'rxjs/operators';
import { EOL } from 'os';
import { localNow } from '../time';
import { isString, isBuffer } from './helpers';
import { Logger, logStream } from '../logging';

export function logSocketStats(
  logger: Logger,
  data: Observable<WebSocket.Data>
) {
  const numberOfMessages = data.pipe(
    filter(isString),
    map((_, i) => i + 1),
    startWith(0)
  );

  const bytesReceived = data.pipe(
    filter(isBuffer),
    scan((sum, item: Buffer) => item.byteLength + sum, 0),
    startWith(0)
  );

  const stats = combineLatest(numberOfMessages, bytesReceived).pipe(
    map(([msgs, bytes]) => ({
      bytesReceived: bytes,
      numberOfMessages: msgs,
      timestamp: localNow(),
    })),
    logStream({
      prefix: `${EOL}🔃  Connection stats`,
      suffix: [EOL],
      on: ['audit', 'unsubscribe'],
      logger,
      unsubscribe: {
        prefix: `${EOL}🔃  Connection stats upon closure`,
      },
    }),
    ignoreElements()
  );

  return stats;
}
