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
import { createSocketEpicContext } from './createSocketEpicContext';
import { logConnected } from './logConnected';
import { createTaggedLogger } from '../logging';

export const spinUpSocketEpic = (
  socket: SocketWithInfo,
  request: MessageWithInfo,
  epic: AnySocketEpic,
  closeSocket: RegistryStateApi['closeSocket']
) => {
  const requestIdTag = {
    rid: request.id.substr(0, 8),
  };

  const logger = createTaggedLogger([requestIdTag]);

  const allData = publishStream(dataStreamFromSocket(socket, logger));

  const commands = actionStreamFromSocket(
    allData,
    epic.actionSchemaByType,
    logger
  );

  const binary = binaryStreamFromSocket(allData);

  const ctx = createSocketEpicContext({
    request,
    commands,
    binary,
    logger,
    depsBuilder: epic.defaultDeps,
  });

  logConnected(logger, socket, request, epic);

  const outgoing = publishStream(epic(commands, ctx));

  const subscription = new Subscription();

  const warningTimeout = epic.completedSocketWarningTimeout ?? 2500;

  const completeWaitTimeout = epic.completedSocketWaitTimeout ?? 5000;

  const logging = [
    logWarningIfOutgoingStreamNotComplete(
      logger,
      allData,
      outgoing,
      warningTimeout,
      socket.id,
      epic.name
    ),
    epic.debugStats && logSocketStats(logger, allData),
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
      epic.send,
      logger
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
