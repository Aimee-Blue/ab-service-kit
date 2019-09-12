import { Socket } from 'net';
import WebSocket from 'ws';
import * as http from 'http';
import uuid from 'uuid';
import url from 'url';
import { SocketWithInfo } from './types';
import { AnySocketEpic } from '../kit';
import { RegistryStateApi } from './socketRegistryState';

export const buildServerUpgradeListener = (
  wss: WebSocket.Server,
  epicsByPath: () => Map<string, AnySocketEpic>,
  add: RegistryStateApi['addSocket']
) =>
  function upgrade(
    request: http.IncomingMessage,
    socket: Socket,
    head: Buffer
  ) {
    if (!request.url) {
      socket.destroy();
      return;
    }

    const pathname = url.parse(request.url).pathname;

    if (typeof pathname !== 'string' || !epicsByPath().has(pathname)) {
      console.log("🤷‍  Path doesn't have a handler", pathname);
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, function done(ws: SocketWithInfo) {
      const id = uuid();

      ws.id = id;

      add({
        id,
        pathname,
        ws,
        socket,
        request,
      });

      wss.emit('connection', ws, request);
    });
  };
