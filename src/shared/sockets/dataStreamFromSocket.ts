import WebSocket from 'ws';
import { Observable } from 'rxjs';
import { EOL } from 'os';
import { localNow } from '../time';
import { SocketWithInfo } from './types';
import { wsCodeToReason } from './wsCodeToReason';
import { Logger, defaultLogger } from '../logging';

export const dataStreamFromSocket = (
  client: SocketWithInfo,
  logger: Logger = defaultLogger
) => {
  return new Observable<WebSocket.Data>(subscriber => {
    const messageHandler = (data: WebSocket.Data) => {
      subscriber.next(data);
    };

    const errorHandler = (error: unknown) => {
      logger.error('💥  Error on client socket', error);
      subscriber.error(error);
    };

    const closeHandler = (code: number, reason: string) => {
      const from = !client.closingByKit ? 'from client side' : 'from our side';
      logger.log(
        `${EOL}👋  Connection closed ${from}, with code ${code}; ${reason ||
          wsCodeToReason(code)}`,
        {
          timestamp: localNow(),
        },
        EOL
      );
      subscriber.complete();
    };

    client.on('message', messageHandler);
    client.on('error', errorHandler);
    client.on('close', closeHandler);

    return () => {
      client.off('message', messageHandler);
      client.off('error', errorHandler);
      client.off('close', closeHandler);
    };
  });
};
