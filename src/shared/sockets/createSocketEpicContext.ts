import { ISocketEpicContext } from '../kit';
import { IncomingMessage } from 'http';
import { Observable } from 'rxjs';
import { fromEventBus, pushToEventBus } from '../eventBus';
import { takeUntil } from 'rxjs/operators';
import { whenCompleted } from '../whenCompleted';
import { IAction } from '../action';
import { logEvents, Logger } from '../logging';

export function createSocketEpicContext<D extends Record<string, unknown> = {}>(
  request: IncomingMessage & { id: string },
  commands: Observable<IAction>,
  binary: Observable<Buffer>,
  logger: Logger,
  depsBuilder?: () => D
): ISocketEpicContext & D {
  const closed = commands.pipe(whenCompleted());

  const takeUntilClosed = () => <T>(stream: Observable<T>) =>
    takeUntil<T>(closed)(stream);

  const subscribe = () => fromEventBus().pipe(takeUntilClosed());

  const publish = () => (stream: Observable<IAction>) =>
    stream.pipe(pushToEventBus());

  const logEventsCustom: typeof logEvents = params =>
    logEvents({
      logger,
      ...(typeof params === 'string'
        ? {
            prefix: params,
          }
        : params),
    });

  const deps: D | {} = depsBuilder?.() ?? {};

  return {
    ...deps,
    request,
    binary,
    publish,
    subscribe,
    logger,
    logEvents: logEventsCustom,
    takeUntilClosed,
  } as D & ISocketEpicContext;
}
