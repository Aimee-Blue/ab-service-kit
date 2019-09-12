import { IServiceConfig } from '../shared';
import { TeardownHandler, noop } from '../shared/teardown';

export async function setupBackground(
  config: IServiceConfig
): Promise<TeardownHandler> {
  if (config.background) {
    const result = await config.background();
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
