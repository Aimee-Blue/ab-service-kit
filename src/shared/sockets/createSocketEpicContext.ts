import { ISocketEpicContext } from '../kit';
import { IncomingMessage } from 'http';
import { Observable } from 'rxjs';
import { fromEventBus, pushToEventBus } from '../eventBus';
import { takeUntil } from 'rxjs/operators';
import { whenCompleted } from '../whenCompleted';
import { IAction } from '../action';
import { TaggedLogger } from '../logging';

export interface ICreateContextParams<D extends Record<string, unknown> = {}> {
  request: IncomingMessage & {
    id: string;
  };
  commands: Observable<IAction>;
  binary: Observable<Buffer>;
  logger: TaggedLogger;
  depsBuilder?: () => D;
}

export function createSocketEpicContext<D extends Record<string, unknown> = {}>(
  params: ICreateContextParams<D>
): ISocketEpicContext & D {
  const { request, commands, binary, logger, depsBuilder } = params;

  const closed = commands.pipe(whenCompleted());

  const takeUntilClosed = () => <T>(stream: Observable<T>) =>
    takeUntil<T>(closed)(stream);

  const subscribe = () => fromEventBus().pipe(takeUntilClosed());

  const publish = () => (stream: Observable<IAction>) =>
    stream.pipe(pushToEventBus());

  const deps: D | {} = depsBuilder?.() ?? {};

  return {
    ...deps,
    request,
    binary,
    publish,
    subscribe,
    logger,
    takeUntilClosed,
  } as D & ISocketEpicContext;
}
