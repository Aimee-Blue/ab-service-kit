import { EOL } from 'os';
import { SocketWithInfo, MessageWithInfo } from './types';
import { AnySocketEpic } from '../kit';
import { registerError } from '../registerError';
import { Logger } from '../logging';
import { localNow } from '../time';

export const logConnected = (
  logger: Logger,
  socket: SocketWithInfo,
  message: MessageWithInfo,
  epic: AnySocketEpic
) => {
  const forwardedFor = message.headers['x-forwarded-for'];
  const remoteAddress = message.connection.remoteAddress;

  let info = {};
  if (epic.logOnConnection) {
    try {
      info = epic.logOnConnection(socket, message);
    } catch (e) {
      registerError(e);
      logger.error(
        '💥  Couldnt get information for logging (your custom SocketEpic.logInfo has thrown!)',
        e
      );
    }
  }

  logger.log(
    `${EOL}✊  Client connected`,
    {
      id: message.id,
      url: message.url,
      epic: epic.name,
      timestamp: localNow(),
      ...(forwardedFor && {
        forwardedFor,
      }),
      ...(remoteAddress && {
        remoteAddress,
      }),
      ...info,
    },
    EOL
  );
};
