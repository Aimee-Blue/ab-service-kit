import WebSocket from 'ws';
import { Observable } from 'rxjs';
import { EOL } from 'os';
import { localNow } from '../time';
import { SocketWithInfo } from './types';
import { wsCodeToReason } from './wsCodeToReason';

export const dataStreamFromSocket = (client: SocketWithInfo) => {
  return new Observable<WebSocket.Data>(subscriber => {
    const messageHandler = (data: WebSocket.Data) => {
      subscriber.next(data);
    };

    const errorHandler = (error: unknown) => {
      console.error('💥  Error on client socket', error);
      subscriber.error(error);
    };

    const closeHandler = (code: number, reason: string) => {
      const from = !client.closingByKit ? 'from client side' : 'from our side';
      console.log(
        `${EOL}👋  Connection closed ${from}, with code ${code}; ${reason ||
          wsCodeToReason(code)}`,
        {
          id: client.id,
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
