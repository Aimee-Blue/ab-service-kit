import Koa from 'koa';
import Router from 'koa-router';
import cors from '@koa/cors';

import * as http from 'http';
import * as https from 'https';

import { IServiceConfig } from '../shared';
import { defaultEndpoints } from '../endpoints';

export async function setupKoa(
  server: http.Server | https.Server,
  config: IServiceConfig
) {
  const app = new Koa();
  const router = new Router();

  app.use(router.routes());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
    })
  );

  if (config.endpoints) {
    if (
      typeof config.shouldUseDefaultEndpoints !== 'boolean' ||
      config.shouldUseDefaultEndpoints
    ) {
      defaultEndpoints(router);
    }
    await config.endpoints(router, app);
  }

  const callback = app.callback();

  server.addListener('request', callback);

  return () => {
    server.removeListener('request', callback);
  };
}
