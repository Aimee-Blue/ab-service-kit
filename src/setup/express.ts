import express from 'express';
import * as http from 'http';
import * as https from 'https';
import cors from 'cors';

import { IServiceConfig, ServiceDeps } from '../shared';
import { defaultEndpoints } from '../endpoints';
import { TeardownHandler } from '../shared/teardown';

export async function setupExpress<D>(
  server: http.Server | https.Server,
  config: IServiceConfig<D>,
  deps: ServiceDeps<D>
): Promise<TeardownHandler> {
  const app = express();

  app.use(
    cors({
      origin: (process.env.CORS_ORIGIN || '').split(','),
      optionsSuccessStatus: 200,
    })
  );

  if (config.endpoints) {
    if (
      typeof config.shouldUseDefaultEndpoints !== 'boolean' ||
      config.shouldUseDefaultEndpoints
    ) {
      defaultEndpoints(app, deps);
    }
    await config.endpoints(app, deps);
  }

  server.addListener('request', app);

  return async () => {
    server.removeListener('request', app);
  };
}
