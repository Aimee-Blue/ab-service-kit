import { IServiceConfig } from '../shared';
import { TeardownHandler, noop } from '../shared/teardown';
import { merge } from 'rxjs';
import { defaultBackground } from '../shared/epics';

export async function setupBackground(
  config: IServiceConfig
): Promise<TeardownHandler> {
  if (config.background) {
    const backgroundConfig = await config.background();
    const result =
      config.shouldUseDefaultBackgroundOperations ||
      typeof config.shouldUseDefaultBackgroundOperations !== 'boolean'
        ? merge(backgroundConfig, defaultBackground)
        : backgroundConfig;
    const subscription = result.subscribe({
      error: err => {
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
