import { IServiceConfig, isDevBuild, ServiceDeps } from '../shared';
import { TeardownHandler, noop } from '../shared/teardown';

export async function setupSpy<D>(
  config: IServiceConfig<D>,
  deps: ServiceDeps<D>
): Promise<TeardownHandler> {
  if (config.spy) {
    const { create } = await import('rxjs-spy');

    const spy = create({
      defaultPlugins: isDevBuild(),
    });

    ((global as unknown) as { [key: string]: unknown }).rxSpy = spy;

    await config.spy(spy, deps);

    deps.logger.log(
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
