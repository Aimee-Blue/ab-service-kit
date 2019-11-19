import * as http from 'http';
import * as https from 'https';
import {
  IServiceConfig,
  ICommandLineArgs,
  BasicLogger,
  ServiceDeps,
} from '../shared';
import { setupSockets } from './sockets';
import { setupExpress } from './express';
import { setupSpy } from './spy';
import { loadEnv } from '../shared/env';
import { setupBackground } from './background';
import { TeardownHandler } from '../shared/teardown';

async function buildDeps<D extends Record<string, unknown>>(
  config: IServiceConfig<D>,
  logger: BasicLogger
): Promise<ServiceDeps<D>> {
  const d: D | {} = await (config.buildDeps?.() ?? Promise.resolve({}));
  const deps = Object.assign(
    {
      logger,
    },
    d
  );
  return deps as ServiceDeps<D>;
}

export async function serviceSetup<D extends Record<string, unknown> = {}>(
  server: http.Server | https.Server,
  config: IServiceConfig<D>,
  params: ICommandLineArgs,
  logger: BasicLogger
): Promise<TeardownHandler> {
  const deps = await buildDeps(config, logger);

  const spy = await setupSpy(config, deps);
  const background = await setupBackground(config, deps);
  const app = await setupExpress(server, config, deps);
  const ws = await setupSockets(server, config, deps);

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
        await loadEnv({
          envFile: params.envFile,
          reset: true,
          logger,
        });
      }
    }
  };
}
