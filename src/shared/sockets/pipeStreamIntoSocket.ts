import { Observable } from 'rxjs';
import { concatMap, ignoreElements } from 'rxjs/operators';
import { SocketWithInfo } from './types';

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
      rej(new Error('Trying to send data while socket already closed'));
    }
  });
};

const defaultErrorHandler = <T>(_data: T, error: Error) => {
  console.error('💥 Error when sending data', error);
};

const defaultClose = (
  socket: SocketWithInfo,
  reason: 'epic-error' | 'epic-completed'
) => {
  if (reason === 'epic-error') {
    socket.close(1011, 'Epic stream error');
  } else if (reason === 'epic-completed') {
    socket.close(1000, 'Epic stream completed');
  } else {
    socket.close();
  }
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
        console.error('💥  Outgoing stream error', error);
        close(socket, 'epic-error');
      },
      complete: () => {
        close(socket, 'epic-completed');
      },
    });

  return subscription;
};
