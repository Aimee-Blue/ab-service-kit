import {
  IServiceConfig,
  registerError,
  mergeBackgroundEpics,
  ServiceDeps,
  createTaggedLogger,
} from '../shared';
import { TeardownHandler, noop } from '../shared/teardown';
import { defaultBackground } from '../shared/epics';
import { fromEventBus, pushToEventBus } from '../shared/eventBus';

export async function setupBackground<D>(
  config: IServiceConfig<D>,
  deps: ServiceDeps<D>
): Promise<TeardownHandler> {
  const useDefault = config.shouldUseDefaultBackgroundOperations ?? true;
  if (config.background || useDefault) {
    const backgroundEpics = await (config.background?.(deps) ??
      Promise.resolve([]));

    const logger = createTaggedLogger([], deps.logger);

    const epic = useDefault
      ? mergeBackgroundEpics(...backgroundEpics, ...defaultBackground)
      : mergeBackgroundEpics(...backgroundEpics);

    const result = epic(fromEventBus(), { logger }).pipe(pushToEventBus());

    const subscription = result.subscribe({
      error: err => {
        registerError(err);
        logger.error(`💥  CRITICAL! Background operations has failed`, err);
      },
    });

    return async () => {
      subscription.unsubscribe();
    };
  } else {
    return noop;
  }
}
