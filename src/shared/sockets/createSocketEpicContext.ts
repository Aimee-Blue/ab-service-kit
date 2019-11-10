import { ISocketEpicContext } from '../kit';
import { IncomingMessage } from 'http';
import { Observable } from 'rxjs';
import { fromEventBus, pushToEventBus } from '../eventBus';
import { takeUntil } from 'rxjs/operators';
import { whenCompleted } from '../whenCompleted';
import { IAction } from '../action';
import { logStream, Logger } from '../logging';

export function createSocketEpicContext(
  request: IncomingMessage & { id: string },
  commands: Observable<IAction>,
  binary: Observable<Buffer>,
  logger: Logger
): ISocketEpicContext {
  const subscribe = () =>
    fromEventBus().pipe(takeUntil(commands.pipe(whenCompleted())));

  const publish = () => (stream: Observable<IAction>) =>
    stream.pipe(pushToEventBus());

  const logStreamCustom: typeof logStream = params =>
    logStream({
      logger,
      ...(typeof params === 'string'
        ? {
            prefix: params,
          }
        : params),
    });

  return {
    request,
    binary,
    publish,
    subscribe,
    logger,
    logStream: logStreamCustom,
  };
}
