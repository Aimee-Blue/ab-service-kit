import WebSocket from 'ws';
import * as http from 'http';
import * as https from 'https';
import url from 'url';
import { Socket } from 'net';
import { IServiceConfig, AnySocketEpic } from '../shared';
import {
  actionStreamFromSocket,
  binaryStreamFromSocket,
  pipeStreamIntoSocket,
  dataStreamFromSocket,
} from '../shared/sockets';
import { Subscription } from 'rxjs';
import { publishStream } from '../shared/publishStream';
import uuid from 'uuid';
import { TeardownHandler } from './teardown';

type Server = http.Server | https.Server;

type SocketHandler = (
  socket: WebSocket & { id: string },
  request: http.IncomingMessage
) => void;

const builderDeps = {
  dataStreamFromSocket,
  pipeStreamIntoSocket,
  actionStreamFromSocket,
  binaryStreamFromSocket,
};

export const socketHandlerBuilder = (
  epicsByPath: () => Map<string, AnySocketEpic>,
  detachFromSocket: (id: string) => void,
  closeSocket: (id: string) => void,
  attachToSocket: (id: string, subscription: Subscription) => void,
  deps = builderDeps
): SocketHandler => (socket, message) => {
  if (!message.url) {
    return;
  }

  const pathname = url.parse(message.url).pathname;
  if (typeof pathname !== 'string') {
    return;
  }

  detachFromSocket(socket.id);

  const handler = epicsByPath().get(pathname);
  if (!handler) {
    closeSocket(socket.id);
    return;
  }

  const data = publishStream(deps.dataStreamFromSocket(socket));

  const commands = deps.actionStreamFromSocket(
    data,
    handler.actionSchemaByType
  );
  const binary = deps.binaryStreamFromSocket(data);

  const results = handler(commands, message, binary);

  const subscription = new Subscription();
  subscription.add(deps.pipeStreamIntoSocket(results, socket, handler.send));
  subscription.add(data.connect());

  attachToSocket(socket.id, subscription);
};
socketHandlerBuilder.defaultDeps = builderDeps;

interface IConnectedSocket {
  id: string;
  pathname: string;
  ws: WebSocket & { id: string };
  socket: Socket;
  request: http.IncomingMessage;
  subscription?: Subscription;
}

type SocketRegistry = ReturnType<typeof createSocketRegistry>;

function createSocketRegistry(
  server: Server,
  epicsByPath: Map<string, AnySocketEpic>
) {
  const state = {
    epicsByPath,
    sockets: new Map<string, IConnectedSocket>(),
  };

  const wss = new WebSocket.Server({ noServer: true });

  wss.on('error', error => {
    console.log('💥  ', error);
  });

  const detachFromSocket = (id: string) => {
    const socketState = state.sockets.get(id);
    if (!socketState) {
      return;
    }

    const { subscription, ...rest } = socketState;

    if (subscription) {
      state.sockets.set(id, rest);

      subscription.unsubscribe();
    }
  };

  const closeSocket = (id: string) => {
    const socketState = state.sockets.get(id);
    if (!socketState) {
      return;
    }

    socketState.ws.close();
    state.sockets.delete(id);
  };

  const attachToSocket = (id: string, subscription: Subscription) => {
    const socketState = state.sockets.get(id);
    if (!socketState) {
      return;
    }

    state.sockets.set(id, {
      ...socketState,
      subscription,
    });
  };

  const onConnection: SocketHandler = socketHandlerBuilder(
    () => state.epicsByPath,
    detachFromSocket,
    closeSocket,
    attachToSocket
  );

  wss.on('connection', onConnection);

  const upgradeListener = function upgrade(
    request: http.IncomingMessage,
    socket: Socket,
    head: Buffer
  ) {
    if (!request.url) {
      socket.destroy();
      return;
    }

    const pathname = url.parse(request.url).pathname;

    if (typeof pathname !== 'string' || !state.epicsByPath.has(pathname)) {
      console.log("🤷‍  Path doesn't have a handler", pathname);
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, function done(
      ws: WebSocket & { id: string }
    ) {
      const id = uuid();

      ws.id = id;

      state.sockets.set(id, {
        id,
        pathname,
        ws,
        socket,
        request,
      });

      ws.once('close', () => {
        detachFromSocket(id);
        state.sockets.delete(id);
      });

      wss.emit('connection', ws, request);
    });
  };

  const onServerClose = async () => {
    server.removeListener('upgrade', upgradeListener);

    for (const socketState of state.sockets.values()) {
      detachFromSocket(socketState.id);

      socketState.ws.close(1012);

      state.sockets.delete(socketState.id);
    }
  };

  server.addListener('upgrade', upgradeListener);

  return {
    switch: (newEpicsByPath: Map<string, AnySocketEpic>) => {
      state.epicsByPath = newEpicsByPath;

      for (const socketState of state.sockets.values()) {
        onConnection(socketState.ws, socketState.request);
      }
    },
    destroy: async () => {
      await onServerClose();
    },
  };
}

function getRegistry(
  server: Server & { registry?: SocketRegistry },
  epicsByPath: Map<string, AnySocketEpic>
) {
  if (server.registry) {
    return server.registry;
  }
  return (server.registry = createSocketRegistry(server, epicsByPath));
}

export async function setupSockets(
  server: http.Server | https.Server,
  config: IServiceConfig
): Promise<TeardownHandler> {
  const pipelines = await ((config.sockets && config.sockets()) ||
    Promise.resolve({}));

  const epicsByPath = new Map<string, AnySocketEpic>(Object.entries(pipelines));

  const registry = getRegistry(server, epicsByPath);

  registry.switch(epicsByPath);

  return async mode => {
    if (mode === 'destroy') {
      await registry.destroy();
    } else {
      // done in switch ...
    }
  };
}
