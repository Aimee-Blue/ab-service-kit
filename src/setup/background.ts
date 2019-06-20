import { IServiceConfig } from '../shared';
import { Subscription } from 'rxjs';

export async function setupBackground(config: IServiceConfig) {
  if (config.background) {
    const result = await config.background();
    return result.subscribe({
      error: err => {
        console.error(`💥  CRITICAL! Background operation has failed`, err);
      },
    });
  } else {
    return Promise.resolve(new Subscription());
  }
}
