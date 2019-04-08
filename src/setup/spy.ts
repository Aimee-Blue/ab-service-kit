import { IServiceConfig } from '../shared';

export async function setupSpy(config: IServiceConfig) {
  const { create } = require('rxjs-spy') as {
    create: typeof import('rxjs-spy').create;
  };
  const spy = create();

  console.log('👀  RxJs Spy initialized');
  if (config.spy) {
    await config.spy(spy);
  }

  return () => {
    spy.teardown();
  };
}
