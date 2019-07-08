import WebSocket from 'ws';
import { Observable, empty, of } from 'rxjs';
import { filter, mergeMap, concatMap, ignoreElements } from 'rxjs/operators';
import { Channels } from '@aimee-blue/ab-shared';
import * as Joi from 'joi';

export function wsCodeToReason(code: number) {
  switch (code) {
    case 1000:
      return 'Normal Closure';
    case 1001:
      return 'Going Away';
    case 1002:
      return 'Protocol Error';
    case 1003:
      return 'Unsupported Data';
    case 1004:
      return '';
    case 1005:
      return 'No Status Received';
    case 1006:
      return 'Abnormal Closure';
    case 1007:
      return 'Invalid frame payload data';
    case 1008:
      return 'Policy Violation';
    case 1009:
      return 'Message too big';
    case 1010:
      return 'Missing Extension';
    case 1011:
      return 'Internal Error';
    case 1012:
      return 'Service Restart';
    case 1013:
      return 'Try Again Later';
    case 1014:
      return 'Bad Gateway';
    case 1015:
      return 'TLS Handshake';
  }
  return '';
}

const isBuffer = (value: WebSocket.Data): value is Buffer => {
  return value instanceof Buffer;
};

const isString = (value: WebSocket.Data): value is string => {
  return typeof value === 'string';
};

export const dataStreamFromSocket = (client: WebSocket & { id?: string }) => {
  return new Observable<WebSocket.Data>(subscriber => {
    const messageHandler = (data: WebSocket.Data) => {
      subscriber.next(data);
    };

    const errorHandler = (error: unknown) => {
      console.error('💥  Error on client socket', error);
      subscriber.error(error);
    };

    const closeHandler = (code: number, reason: string) => {
      console.log(
        `👋  Connection closed from client side with code ${code}; ${reason ||
          wsCodeToReason(code)}`
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

const tryParse = <T>(text: string): T | null => {
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    console.error('💥  Cannot parse incoming message', err);
    return null;
  }
};

export const actionStreamFromSocket = <T extends { type: string }>(
  data: Observable<WebSocket.Data>,
  actionSchemaByType = Channels.actionSchemaByType
) => {
  return data.pipe(
    filter(isString),
    mergeMap(nonParsed => {
      const value = tryParse<T>(nonParsed);
      if (value === null) {
        return empty();
      }

      if (typeof value !== 'object' || !('type' in value)) {
        console.error('💥  No type property in incoming message');
        return empty();
      }

      const schema = actionSchemaByType(value.type);

      if (!schema) {
        console.error('💥  No schema found for type', value.type);
        return empty();
      }

      const result = Joi.validate(value, schema);

      if (result.error as Error | null) {
        console.error('💥  Invalid message of type', value.type);
        return empty();
      }

      return of(result.value);
    })
  );
};

export const binaryStreamFromSocket = (data: Observable<WebSocket.Data>) => {
  return data.pipe(filter(isBuffer));
};

const defaultSend = <T>(socket: WebSocket, data: T): Promise<void> => {
  return new Promise<void>((res, rej) => {
    if (socket.readyState === socket.OPEN) {
      socket.send(data instanceof Buffer ? data : JSON.stringify(data), err => {
        if (err) {
          rej(err);
        } else {
          res();
        }
      });
    } else {
      rej(new Error('Trying to send data while socket is not ready'));
    }
  });
};

const defaultErrorHandler = <T>(_data: T, error: Error) => {
  console.error('💥 Error when sending data', error);
};

export const pipeStreamIntoSocket = <T>(
  stream: Observable<T>,
  socket: WebSocket,
  send: typeof defaultSend = defaultSend,
  onSendError: typeof defaultErrorHandler = defaultErrorHandler
) => {
  const subscription = stream
    .pipe(
      concatMap(data =>
        send(socket, data).catch((err: Error) => {
          onSendError(data, err);

          return Promise.reject(err);
        })
      ),
      ignoreElements()
    )
    .subscribe({
      error: error => {
        console.error('💥  Outgoing stream error', error);
        socket.close(1011, 'Outgoing stream error');
      },
      complete: () => {
        socket.close(1000, 'Outgoing stream completed');
      },
    });

  socket.on('close', () => {
    subscription.unsubscribe();
  });

  return subscription;
};
