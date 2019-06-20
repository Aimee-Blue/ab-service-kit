import * as http from 'http';
import * as https from 'https';
import { IServiceConfig, ICommandLineArgs, publishToEventBus } from '../shared';
import { setupSockets } from './sockets';
import { setupExpress } from './express';
import { setupSpy } from './spy';
import { loadEnv } from './env';
import { startup } from '../shared/startup';
import { setupBackground } from './background';

export async function serviceSetup(
  server: http.Server | https.Server,
  config: IServiceConfig,
  params: ICommandLineArgs
) {
  const tearDownSpy = await setupSpy(config);
  const background = await setupBackground(config);
  const unsubscribeApp = await setupExpress(server, config);
  const unsubscribeWs = await setupSockets(server, config);

  publishToEventBus(startup(server, config, params));

  return async () => {
    background.unsubscribe();
    unsubscribeApp();
    unsubscribeWs();
    tearDownSpy();

    await loadEnv(params.envFile);
  };
}
