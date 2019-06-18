import express from 'express';
import * as http from 'http';
import * as https from 'https';
import cors from 'cors';

import { IServiceConfig } from '../shared';
import { defaultEndpoints } from '../endpoints';

export async function setupExpress(
  server: http.Server | https.Server,
  config: IServiceConfig
) {
  const app = express();

  const corsWhitelist = (process.env.CORS_ORIGIN || '').split(',');
  app.use(
    cors({
      origin: (origin, callback) => {
        if (origin && corsWhitelist.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      optionsSuccessStatus: 200,
    })
  );

  if (config.endpoints) {
    if (
      typeof config.shouldUseDefaultEndpoints !== 'boolean' ||
      config.shouldUseDefaultEndpoints
    ) {
      defaultEndpoints(app);
    }
    await config.endpoints(app);
  }

  server.addListener('request', app);

  return () => {
    server.removeListener('request', app);
  };
}
