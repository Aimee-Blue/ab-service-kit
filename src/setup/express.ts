import express from 'express';
import * as http from 'http';
import * as https from 'https';
import cors from 'cors';
import bodyParser from 'body-parser';

import { IServiceConfig } from '../shared';
import { defaultEndpoints } from '../endpoints';

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

  app.use(bodyParser.json());

  app.post('/tester', (req, res) => {
    console.log(req.body);
    console.log(req.params);
    res.send().status(200);
  });

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
