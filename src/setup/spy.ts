import { IServiceConfig, isDevBuild } from '../shared';
import { TeardownHandler, noop } from './teardown';

export async function setupSpy(
  config: IServiceConfig
): Promise<TeardownHandler> {
  if (config.spy) {
    const { create } = require('rxjs-spy') as typeof import('rxjs-spy');

    const spy = create({
      defaultPlugins: isDevBuild(),
    });

    ((global as unknown) as { [key: string]: unknown }).rxSpy = spy;

    await config.spy(spy);

    console.log(
      '👀  RxJs Spy initialized',
      isDevBuild() ? '[all plugins]' : '[only logging]'
    );

    return async () => {
      spy.teardown();
    };
  } else {
    return noop;
  }
}
