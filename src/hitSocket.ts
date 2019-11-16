import WebSocket from 'ws';
import { fromEvent, merge, empty, Subscription, Observable } from 'rxjs';
import {
  actionStreamFromSocket,
  dataStreamFromSocket,
  pipeStreamIntoSocket,
} from './shared/sockets';
import Joi from '@hapi/joi';
import {
  concatMap,
  map,
  finalize,
  ignoreElements,
  endWith,
  tap,
} from 'rxjs/operators';
import { defaultBasicLogger } from './shared';

const url = 'http://localhost:4010/events';

async function start() {
  const logger = defaultBasicLogger();

  const ws = new WebSocket(url);
  const socket = Object.assign(ws, { id: 'test-socket', closingByKit: false });

  process.stdin.setEncoding('utf8');

  const data = fromEvent(process.stdin, 'data') as Observable<string>;

  const allData = dataStreamFromSocket(socket);

  const actions = actionStreamFromSocket(allData, () => Joi.object());

  const jobs = merge(
    actions.pipe(
      concatMap(action => {
        logger.log('  -> Received', action);
        return empty();
      })
    )
  );

  const subscriptions = new Subscription();

  subscriptions.add(
    pipeStreamIntoSocket(
      data.pipe(
        map(text => ({
          type: 'TEST',
          text: text.replace('\n', ''),
        })),
        tap(action => {
          logger.log('  <- Sending', action);
        })
      ),
      socket
    )
  );

  return jobs
    .pipe(
      finalize(() => {
        subscriptions.unsubscribe();
      }),
      ignoreElements(),
      endWith()
    )
    .toPromise();
}

start().catch(err => {
  defaultBasicLogger().error('', err);
});
