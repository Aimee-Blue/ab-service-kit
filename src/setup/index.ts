import * as http from 'http';
import * as https from 'https';
import { IServiceConfig, ICommandLineArgs, publishToEventBus } from '../shared';
import { setupSockets } from './sockets';
import { setupExpress } from './express';
import { setupSpy } from './spy';
import { loadEnv } from './env';
import { startup } from '../shared/startup';
import { setupBackground } from './background';
import { TeardownHandler } from './teardown';

export async function serviceSetup(
  server: http.Server | https.Server,
  config: IServiceConfig,
  params: ICommandLineArgs
): Promise<TeardownHandler> {
  const spy = await setupSpy(config);
  const background = await setupBackground(config);
  const app = await setupExpress(server, config);
  const ws = await setupSockets(server, config);

  publishToEventBus(startup(server, config, params));

  return async mode => {
    await ws(mode);
    await app(mode);
    await background(mode);
    await spy(mode);

    if (mode === 'watch-mode') {
      const shouldLoadEnvFiles =
        typeof config.shouldLoadEnvFiles === 'boolean'
          ? config.shouldLoadEnvFiles
          : true;

      if (shouldLoadEnvFiles) {
        await loadEnv(params.envFile);
      }
    }
  };
}
