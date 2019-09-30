import { Socket } from 'net';
import WebSocket from 'ws';
import uuid from 'uuid';
import url from 'url';
import { SocketWithInfo, MessageWithInfo } from './types';
import { AnySocketEpic } from '../kit';
import { RegistryStateApi } from './socketRegistryState';

export const buildServerUpgradeListener = (
  wss: WebSocket.Server,
  epicsByPath: () => Map<string, AnySocketEpic>,
  add: RegistryStateApi['addSocket']
) =>
  function upgrade(request: MessageWithInfo, socket: Socket, head: Buffer) {
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

      if ('id' in ws) {
        throw new Error('id already exists in socket');
      }
      if ('id' in request) {
        throw new Error('id already exists in request');
      }

      ws.id = id;
      request.id = id;

      add({
        id,
        pathname,
        ws,
        socket,
        request,
        onDetach: 'disconnect',
      });

      wss.emit('connection', ws, request);
    });
  };
