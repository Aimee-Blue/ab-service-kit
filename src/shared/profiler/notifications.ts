import { Observable, of, Subscriber } from 'rxjs';
import { ignoreElements, endWith, tap } from 'rxjs/operators';
import { publishStream } from '../publishStream';
import { registerError } from '../registerError';

export type TagNotification =
  | 'next'
  | 'after-next'
  | 'complete'
  | 'subscribe'
  | 'unsubscribe';

function onNotification<T>(
  notification: TagNotification,
  stream: Observable<T>
): Observable<unknown> {
  if (notification === 'next') {
    return stream;
  } else if (notification === 'complete') {
    return stream.pipe(
      ignoreElements(),
      endWith(undefined)
    );
  } else if (notification === 'subscribe') {
    return of(undefined);
  } else {
    throw new Error('Notification type is not supported');
  }
}

export function executeOnNotification(
  notification: TagNotification | Observable<unknown>,
  cb: () => void
) {
  return <T>(stream: Observable<T>) => {
    return new Observable<T>(subscriber => {
      // this subscriber just ignores all events
      // we do not want to modify behaviour of the
      // source stream
      const ignoreSubscriber = new Subscriber<null | undefined>({
        next: () => {
          return;
        },
        complete: () => {
          return;
        },
        error: err => {
          registerError(err);
          console.error('💥  Profiler error', err);
        },
      });

      // source stream:
      const shared = publishStream(stream);

      if (notification === 'unsubscribe') {
        subscriber.add(() => {
          cb();
        });
      } else if (typeof notification === 'string') {
        const notifications = onNotification(notification, shared);

        subscriber.add(
          notifications
            .pipe(
              tap(() => {
                cb();
              }),
              ignoreElements()
            )
            .subscribe(ignoreSubscriber)
        );
      } else {
        subscriber.add(
          notification
            .pipe(
              tap(() => {
                cb();
              }),
              ignoreElements()
            )
            .subscribe(ignoreSubscriber)
        );
      }

      subscriber.add(shared.subscribe(subscriber));
      subscriber.add(shared.connect());
    });
  };
}
