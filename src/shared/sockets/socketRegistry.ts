import { Socket } from 'net';
import WebSocket from 'ws';
import * as http from 'http';
import uuid from 'uuid';
import url from 'url';
import { SocketWithInfo, Server, SocketHandler } from './types';
import { AnySocketEpic } from '../kit';
import { socketHandlerBuilder } from './socketHandlerBuilder';
import {
  RegistryStateApi,
  IConnectedSocket,
  buildRegistryStateApi,
} from './socketRegistryState';

export type SocketRegistry = ReturnType<typeof createSocketRegistry>;

const buildServerUpgradeListener = (
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

export function createSocketRegistry(
  server: Server,
  epicsByPath: Map<string, AnySocketEpic>
) {
  const state = {
    epicsByPath,
    sockets: new Map<string, IConnectedSocket>(),
  };

  const api = buildRegistryStateApi(state);

  const wss = new WebSocket.Server({ noServer: true });

  wss.on('error', error => {
    console.log('💥  ', error);
  });

  const onConnection: SocketHandler = socketHandlerBuilder(
    () => state.epicsByPath,
    api.closeSocket,
    api.attachToSocket
  );

  wss.on('connection', onConnection);

  const upgradeListener = buildServerUpgradeListener(
    wss,
    () => state.epicsByPath,
    api.addSocket
  );

  server.addListener('upgrade', upgradeListener);

  return {
    initialize: (newEpicsByPath: Map<string, AnySocketEpic>) => {
      state.epicsByPath = newEpicsByPath;

      for (const socketState of state.sockets.values()) {
        onConnection(socketState.ws, socketState.request);
      }
    },
    deinitialize: async () => {
      for (const socketState of state.sockets.values()) {
        api.detachFromSocketInWatchMode(socketState.id);
      }
    },
    destroy: async () => {
      server.removeListener('upgrade', upgradeListener);

      await api.onServerClose();
    },
  };
}

export function getRegistry(
  server: Server & { registry?: SocketRegistry },
  epicsByPath: Map<string, AnySocketEpic>
) {
  if (server.registry) {
    return server.registry;
  }
  return (server.registry = createSocketRegistry(server, epicsByPath));
}
