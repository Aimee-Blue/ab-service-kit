import { IServiceConfig } from '../shared';
import { TeardownHandler, noop } from '../shared/teardown';
import { merge } from 'rxjs';
import { sendAppErrorsToCloud } from '../shared/epics';

export async function setupBackground(
  config: IServiceConfig
): Promise<TeardownHandler> {
  if (config.background) {
    // TODO make this more readable and create an array of default background operations to make it easy to add more in future.
    const result =
      config.shouldUseDefaultBackgroundOperations ||
      typeof config.shouldUseDefaultBackgroundOperations !== 'boolean'
        ? merge(await config.background(), sendAppErrorsToCloud())
        : await config.background();
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
