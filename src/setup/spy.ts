import { IServiceConfig } from '../shared';
import { TeardownHandler, noop } from './teardown';

export async function setupSpy(
  config: IServiceConfig
): Promise<TeardownHandler> {
  if (config.spy) {
    const { create } = require('rxjs-spy') as typeof import('rxjs-spy');
    const spy = create();

    await config.spy(spy);

    console.log('👀  RxJs Spy initialized');

    return async () => {
      spy.teardown();
    };
  } else {
    return noop;
  }
}
