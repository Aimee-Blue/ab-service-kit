import { IServiceConfig, registerError, mergeBackgroundEpics } from '../shared';
import { TeardownHandler, noop } from '../shared/teardown';
import { defaultBackground } from '../shared/epics';
import { fromEventBus, pushToEventBus } from '../shared/eventBus';

export async function setupBackground(
  config: IServiceConfig
): Promise<TeardownHandler> {
  const useDefault = config.shouldUseDefaultBackgroundOperations ?? true;
  if (config.background || useDefault) {
    const backgroundEpics = await (config.background?.() ??
      Promise.resolve([]));

    const epic = useDefault
      ? mergeBackgroundEpics(...backgroundEpics, ...defaultBackground)
      : mergeBackgroundEpics(...backgroundEpics);

    const result = epic(fromEventBus()).pipe(pushToEventBus());

    const subscription = result.subscribe({
      error: err => {
        registerError(err);
        console.error(`💥  CRITICAL! Background operation has failed`, err);
      },
    });

    return async () => {
      subscription.unsubscribe();
    };
  } else {
    return noop;
  }
}
