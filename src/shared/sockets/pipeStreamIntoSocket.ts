import { Observable } from 'rxjs';
import { concatMap, ignoreElements } from 'rxjs/operators';
import { SocketWithInfo } from './types';

const SOCKET_CLOSED = 'Trying to send data while socket already closed';

const defaultSend = <T>(socket: SocketWithInfo, data: T): Promise<void> => {
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

const defaultErrorHandler = <T>(_data: T, error: Error) => {
  console.error('💥  Error when sending data', error);
};

const defaultClose = (socket: SocketWithInfo, code?: number) => {
  socket.close(code);
};

export const pipeStreamIntoSocket = <T>(
  stream: Observable<T>,
  socket: SocketWithInfo,
  close: typeof defaultClose = defaultClose,
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
        if (!(error instanceof Error && error.message === SOCKET_CLOSED)) {
          console.error('💥  Outgoing stream error', error);
        }
        close(socket, 1011);
      },
      complete: () => {
        close(socket, 1000);
      },
    });

  return subscription;
};
