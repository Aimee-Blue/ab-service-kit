import * as WebSocket from 'ws';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import { Socket } from 'net';
import { IServiceConfig, AnySocketEpic } from '../shared';
import {
  actionStreamFromSocket,
  binaryStreamFromSocket,
  pipeStreamIntoSocket,
  dataStreamFromSocket,
} from '../shared/sockets';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { publishStream } from '../shared/publishStream';

type SocketHandler = (socket: WebSocket, request: http.IncomingMessage) => void;

function createSocket(handler: SocketHandler): WebSocket.Server {
  const wss = new WebSocket.Server({ noServer: true });

  wss.on('error', error => {
    console.log('💥  ', error);
  });

  wss.on('connection', handler);

  return wss;
}

function noop() {
  return;
}

const builderDeps = {
  dataStreamFromSocket,
  pipeStreamIntoSocket,
  actionStreamFromSocket,
  binaryStreamFromSocket,
};

export const socketHandlerBuilder = (
  pipelines: Map<string, AnySocketEpic>,
  deps = builderDeps
): SocketHandler => (socket, message) => {
  if (!message.url) {
    return;
  }

  const pathname = url.parse(message.url).pathname;
  if (typeof pathname !== 'string') {
    return;
  }

  const handler = pipelines.get(pathname);
  if (!handler) {
    return;
  }

  const data = publishStream(deps.dataStreamFromSocket(socket));

  const commands = deps.actionStreamFromSocket(data);
  const binary = deps.binaryStreamFromSocket(data);

  const results = handler(commands, message, binary);

  const subscription = new Subscription();
  subscription.add(
    deps.pipeStreamIntoSocket(
      results.pipe(
        finalize(() => {
          subscription.unsubscribe();
          socket.close(1000, 'OK');
        })
      ),
      socket
    )
  );
  subscription.add(data.connect());
};
socketHandlerBuilder.defaultDeps = builderDeps;

export async function setupSockets(
  server: http.Server | https.Server,
  config: IServiceConfig
) {
  if (!config.sockets) {
    return noop;
  }

  const pipelines = await config.sockets();

  const epicsByPath = new Map<string, AnySocketEpic>(Object.entries(pipelines));
  if (epicsByPath.size === 0) {
    return noop;
  }

  const wss = createSocket(socketHandlerBuilder(epicsByPath));

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

    if (typeof pathname === 'string' && epicsByPath.has(pathname)) {
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
