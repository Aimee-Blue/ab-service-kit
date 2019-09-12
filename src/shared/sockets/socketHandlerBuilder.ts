import url from 'url';
import { EOL } from 'os';
import { Subscription, merge } from 'rxjs';
import { ignoreElements } from 'rxjs/operators';
import { publishStream } from '../publishStream';
import { SocketHandler } from './types';
import { AnySocketEpic } from '../kit';
import { isTruthy } from '../isTruthy';
import { prepareWaitForCompletionFn } from './prepareWaitForCompletionFn';
import { dataStreamFromSocket } from './dataStreamFromSocket';
import { pipeStreamIntoSocket } from './pipeStreamIntoSocket';
import { actionStreamFromSocket } from './actionStreamFromSocket';
import { binaryStreamFromSocket } from './binaryStreamFromSocket';
import { logSocketStats } from './logSocketStats';
import { logWarningIfOutgoingStreamNotComplete } from './logWarningIfOutgoingStreamNotComplete';
import { RegistryStateApi } from './socketRegistryState';

const logConnected: SocketHandler = (socket, message) => {
  const ip =
    message.headers['x-forwarded-for'] || message.connection.remoteAddress;

  console.log(
    `${EOL}✊  Client connected`,
    {
      id: socket.id,
      url: message.url,
      ip,
    },
    EOL
  );
};

const builderDeps = Object.freeze({
  dataStreamFromSocket,
  pipeStreamIntoSocket,
  actionStreamFromSocket,
  binaryStreamFromSocket,
  logSocketStats,
  logWarningIfOutgoingStreamNotComplete,
  logConnected,
  prepareWaitForCompletionFn,
});

export const socketHandlerBuilder = (
  epicsByPath: () => Map<string, AnySocketEpic>,
  closeSocket: RegistryStateApi['closeSocket'],
  attachToSocket: RegistryStateApi['attachToSocket'],
  deps = builderDeps
): SocketHandler => (socket, message) => {
  if (!message.url) {
    return;
  }

  const pathname = url.parse(message.url).pathname;
  if (typeof pathname !== 'string') {
    return;
  }

  const handler = epicsByPath().get(pathname);
  if (!handler) {
    closeSocket(socket.id, 1000);
    return;
  }

  deps.logConnected(socket, message);

  const data = publishStream(deps.dataStreamFromSocket(socket));

  const commands = deps.actionStreamFromSocket(
    data,
    handler.actionSchemaByType
  );

  const binary = deps.binaryStreamFromSocket(data);

  const outgoing = publishStream(handler(commands, message, binary));

  const subscription = new Subscription();

  const warningTimeout =
    typeof handler.completedSocketWarningTimeout === 'number'
      ? handler.completedSocketWarningTimeout
      : 5000;

  const logging = [
    deps.logWarningIfOutgoingStreamNotComplete(
      data,
      outgoing,
      warningTimeout,
      socket.id
    ),
    handler.debugStats && deps.logSocketStats(data, socket.id),
  ].filter(isTruthy);

  const allEpicJobs = merge(outgoing.pipe(ignoreElements()), ...logging);

  const { connect, waitForCompletion } = deps.prepareWaitForCompletionFn(
    allEpicJobs
  );

  subscription.add(deps.pipeStreamIntoSocket(outgoing, socket, handler.send));

  subscription.add(connect());
  subscription.add(outgoing.connect());
  subscription.add(data.connect());

  attachToSocket(socket.id, subscription, waitForCompletion);
};
socketHandlerBuilder.defaultDeps = builderDeps;
