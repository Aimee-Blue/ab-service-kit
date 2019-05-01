import { IServiceConfig } from '../shared';

export async function setupSpy(config: IServiceConfig) {
  if (config.spy) {
    const { create } = require('rxjs-spy') as typeof import('rxjs-spy');
    const spy = create();

    await config.spy(spy);

    console.log('👀  RxJs Spy initialized');

    return () => {
      spy.teardown();
    };
  } else {
    return () => {
      return;
    };
  }
}
