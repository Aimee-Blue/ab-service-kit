import { EOL } from 'os';
import { Subscription, merge } from 'rxjs';
import { ignoreElements } from 'rxjs/operators';
import { publishStream } from '../publishStream';
import { SocketWithInfo, MessageWithInfo } from './types';
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
import { registerError } from '../registerError';

const logConnected = (
  socket: SocketWithInfo,
  message: MessageWithInfo,
  epic: AnySocketEpic
) => {
  const ip =
    message.headers['x-forwarded-for'] || message.connection.remoteAddress;

  let info = {};
  if (epic.logInfo) {
    try {
      info = epic.logInfo(socket, message);
    } catch (e) {
      registerError(e);
      console.error(
        '💥  Couldnt get information for logging (your custom SocketEpic.logInfo has thrown!)',
        e
      );
    }
  }

  console.log(
    `${EOL}✊  Client connected`,
    {
      id: message.id,
      url: message.url,
      epic: epic.name,
      ip,
      ...info,
    },
    EOL
  );
};

export const spinUpSocketEpic = (
  socket: SocketWithInfo,
  message: MessageWithInfo,
  epic: AnySocketEpic,
  closeSocket: RegistryStateApi['closeSocket']
) => {
  logConnected(socket, message, epic);

  const allData = publishStream(dataStreamFromSocket(socket));

  const commands = actionStreamFromSocket(allData, epic.actionSchemaByType);

  const binary = binaryStreamFromSocket(allData);

  const outgoing = publishStream(epic(commands, message, binary));

  const subscription = new Subscription();

  const warningTimeout =
    typeof epic.completedSocketWarningTimeout === 'number'
      ? epic.completedSocketWarningTimeout
      : 2500;

  const completeWaitTimeout =
    typeof epic.completedSocketWaitTimeout === 'number'
      ? epic.completedSocketWaitTimeout
      : 5000;

  const logging = [
    logWarningIfOutgoingStreamNotComplete(
      allData,
      outgoing,
      warningTimeout,
      socket.id
    ),
    epic.debugStats && logSocketStats(allData, socket.id),
  ].filter(isTruthy);

  const allEpicJobs = merge(outgoing.pipe(ignoreElements()), ...logging);

  const { connect, waitForCompletion } = prepareWaitForCompletionFn(
    allEpicJobs,
    completeWaitTimeout
  );

  subscription.add(
    pipeStreamIntoSocket(
      outgoing,
      socket,
      (sock, code) => {
        closeSocket(sock.id, code);
      },
      epic.send
    )
  );

  subscription.add(connect());
  subscription.add(outgoing.connect());
  subscription.add(allData.connect());

  return {
    subscription,
    waitForCompletion,
  };
};
