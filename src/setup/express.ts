import express from 'express';
import * as http from 'http';
import * as https from 'https';
import cors from 'cors';

import { IServiceConfig } from '../shared';

export async function setupExpress(
  server: http.Server | https.Server,
  config: IServiceConfig
) {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
      optionsSuccessStatus: 200,
    })
  );

  if (config.endpoints) {
    await config.endpoints(app);
  }

  server.addListener('request', app);

  return () => {
    server.removeListener('request', app);
  };
}
