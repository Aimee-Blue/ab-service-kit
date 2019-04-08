import * as http from 'http';
import * as https from 'https';
import { IServiceConfig, ICommandLineArgs } from '../shared';
import { setupSockets } from './sockets';
import { setupExpress } from './express';
import { setupSpy } from './spy';
import { loadEnv } from './env';
import { startup } from './startup';

function emitStartup(
  server: http.Server | https.Server,
  config: IServiceConfig,
  args: ICommandLineArgs
) {
  startup.next({
    server,
    config,
    args,
  });
}

export async function serviceSetup(
  server: http.Server | https.Server,
  config: IServiceConfig,
  params: ICommandLineArgs
) {
  const tearDownSpy = await setupSpy(config);
  const unsubscribeApp = await setupExpress(server, config);
  const unsubscribeWs = await setupSockets(server, config);

  emitStartup(server, config, params);

  return async () => {
    unsubscribeApp();
    unsubscribeWs();
    tearDownSpy();

    await loadEnv(params.envFile);
  };
}
