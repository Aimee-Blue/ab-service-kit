import * as http from 'http';
import * as https from 'https';
import { IServiceConfig, AnySocketEpic } from '../shared';
import { TeardownHandler } from '../shared/teardown';
import { defaultSocketsMap } from '../shared/epics';
import { getRegistry } from '../shared/sockets';

export async function setupSockets(
  server: http.Server | https.Server,
  config: IServiceConfig,
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
    ? config.sockets()
    : Promise.resolve({}));

  const pipelines = {
    ...defaultPipelines,
    ...configPipelines,
  };

  const epicsByPath = new Map<string, AnySocketEpic>(Object.entries(pipelines));

  const registry = deps.getRegistry(server, epicsByPath);

  registry.initialize(epicsByPath);

  return async mode => {
    if (mode === 'destroy') {
      await registry.destroy();
    } else {
      await registry.deinitialize();
    }
  };
}
