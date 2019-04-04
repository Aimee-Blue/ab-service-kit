import * as http from 'http';
import * as https from 'https';
import { IServiceConfig } from '../common/types';
import { setupSockets } from './sockets';
import { setupExpress } from './express';

export async function serviceSetup(
  server: http.Server | https.Server,
  config: IServiceConfig
) {
  const unsubscribeApp = await setupExpress(server, config);
  const unsubscribeWs = await setupSockets(server, config);

  return () => {
    unsubscribeApp();
    unsubscribeWs();

    server.removeAllListeners();
  };
}
