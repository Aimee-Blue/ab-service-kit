import express from 'express';
import WebSocket from 'ws';
import * as http from 'http';
import * as https from 'https';
import url from 'url';
import { Socket } from 'net';
import cors from 'cors';
import { IServiceConfig } from './types';

function setupExpress(
  server: http.Server | https.Server,
  config: IServiceConfig
) {
  const app = express();

  app.use(
    cors({
      origin: 'https://aimeeblue.com',
      optionsSuccessStatus: 200,
    })
  );

  if (config.endpoints) {
    config.endpoints(app);
  }

  server.on('request', app);

  return () => {
    server.off('request', app);
  };
}

export function serverSetup(
  server: http.Server | https.Server,
  config: IServiceConfig
) {
  const unsubscribeApp = setupExpress(server, config);
  const unsubscribeWs = setupSockets(server, config);
  return () => {
    unsubscribeApp();
    unsubscribeWs();

    server.removeAllListeners();
  };
}
