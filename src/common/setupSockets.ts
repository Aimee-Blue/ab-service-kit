import express from 'express';
import WebSocket from 'ws';
import * as http from 'http';
import * as https from 'https';
import url from 'url';
import { Socket } from 'net';
import cors from 'cors';
import { IServiceConfig } from './types';

type SocketHandler = (
  this: WebSocket,
  socket: WebSocket,
  request: http.IncomingMessage
) => void;

function createSocket(
  server: http.Server | https.Server,
  path: string,
  handler: SocketHandler
): WebSocket.Server {
  const wss = new WebSocket.Server({
    server,
    path,
  });

  wss.close();

  wss.on('error', error => {
    console.log('💥  ', error);
  });

  wss.on('connection', handler);

  return wss;
}

export function setupSockets(
  server: http.Server | https.Server,
  config: IServiceConfig
) {
  if (!config.sockets) {
    return () => {
      return;
    };
  }

  const paths = Object.keys(config.sockets);

  if (paths.length === 0) {
    return () => {
      return;
    };
  }

  const socketServers = new Map<string, WebSocket.Server>();

  for (const path of paths) {
    const wss = createSocket(server, path, (socket, message) => {});
  }

  const upgradeListener = function upgrade(
    request: http.IncomingMessage,
    socket: Socket,
    head: Buffer
  ) {
    const pathname = url.parse(request.url!).pathname;

    if (pathname === '/voice-to-text') {
      wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  };

  server.addListener('upgrade', upgradeListener);

  return () => {
    server.removeListener('upgrade', upgradeListener);
  };
}
