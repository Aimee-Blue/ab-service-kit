import * as http from 'http';
import * as https from 'https';
import { IServiceConfig, ICommandLineArgs } from '../common/types';
import { setupSockets } from './sockets';
import { setupExpress } from './express';
import { setupSpy } from './spy';
import { loadEnv } from './env';

export async function serviceSetup(
  server: http.Server | https.Server,
  config: IServiceConfig,
  params: ICommandLineArgs
) {
  const tearDownSpy = await setupSpy(config);
  const unsubscribeApp = await setupExpress(server, config);
  const unsubscribeWs = await setupSockets(server, config);

  return () => {
    unsubscribeApp();
    unsubscribeWs();
    tearDownSpy();

    loadEnv(params.envFile);
  };
}
