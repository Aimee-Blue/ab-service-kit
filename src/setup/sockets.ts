import * as http from 'http';
import * as https from 'https';
import { IServiceConfig, AnySocketEpic, ServiceDeps } from '../shared';
import { TeardownHandler } from '../shared/teardown';
import { defaultSocketsMap } from '../shared/epics';
import { getRegistry } from '../shared/sockets';

export async function setupSockets<D>(
  server: http.Server | https.Server,
  config: IServiceConfig<D>,
  sharedDeps: ServiceDeps<D>,
  deps = {
    getRegistry,
  }
): Promise<TeardownHandler> {
  const defaultPipelines =
    typeof config.shouldUseDefaultEndpoints !== 'boolean' ||
    config.shouldUseDefaultEndpoints
      ? defaultSocketsMap()
      : {};

  const configPipelines = await (config.sockets
    ? config.sockets(sharedDeps)
    : Promise.resolve({}));

  const pipelines = {
    ...defaultPipelines,
    ...configPipelines,
  };

  const epicsByPath = new Map<string, AnySocketEpic>(Object.entries(pipelines));

  const registry = deps.getRegistry(server, epicsByPath, sharedDeps.logger);

  registry.initialize(epicsByPath);

  return async mode => {
    if (mode === 'destroy') {
      await registry.destroy();
    } else {
      await registry.deinitialize();
    }
  };
}
