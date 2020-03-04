import { Observable } from 'rxjs';
import { concatMap, ignoreElements } from 'rxjs/operators';
import { SocketWithInfo } from './types';
import { registerError } from '../registerError';
import { defaultLogger, Logger } from '../logging';
import { IAction } from '../action';

const SOCKET_CLOSED = 'Trying to send data while socket already closed';

export const defaultSendToSocket = <T extends Buffer | IAction>(
  socket: SocketWithInfo,
  data: T
): Promise<void> => {
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
      rej(new Error(SOCKET_CLOSED));
    }
  });
};

const defaultSendToSocketErrorHandler = <T>(
  data: T,
  error: Error,
  logger: Logger
) => {
  if (error.message === SOCKET_CLOSED) {
    logger.warn('🚨  Socket was closed before we could send data back', data);
  } else {
    registerError(error);
    logger.error('💥  Error when sending data', data, error);
  }
};

const defaultCloseSocket = (socket: SocketWithInfo, code?: number) => {
  socket.close(code);
};

export const pipeStreamIntoSocket = <T extends Buffer | IAction>(
  stream: Observable<T>,
  socket: SocketWithInfo,
  optsRaw?: Partial<{
    close: typeof defaultCloseSocket;
    send: typeof defaultSendToSocket;
    logger: Logger;
    onSendError: typeof defaultSendToSocketErrorHandler;
    closeOnError: boolean;
    closeOnComplete: boolean;
  }>
) => {
  const opts = {
    close: optsRaw?.close ?? defaultCloseSocket,
    send: optsRaw?.send ?? defaultSendToSocket,
    logger: optsRaw?.logger ?? defaultLogger,
    onSendError: optsRaw?.onSendError ?? defaultSendToSocketErrorHandler,
    closeOnError: optsRaw?.closeOnError ?? true,
    closeOnComplete: optsRaw?.closeOnComplete ?? true,
  };

  const subscription = stream
    .pipe(
      concatMap(data =>
        opts.send(socket, data).catch((err: Error) => {
          opts.onSendError(data, err, opts.logger);

          return Promise.reject(err);
        })
      ),
      ignoreElements()
    )
    .subscribe({
      error: error => {
        if (!(error instanceof Error && error.message === SOCKET_CLOSED)) {
          opts.logger.error('💥  Outgoing stream error', error);
        }
        if (opts.closeOnError) {
          opts.close(socket, 1011);
        }
      },
      complete: () => {
        if (opts.closeOnComplete) {
          opts.close(socket, 1000);
        }
      },
    });

  return subscription;
};
