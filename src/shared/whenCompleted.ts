import { Observable } from 'rxjs';

export const whenCompleted = () => (stream: Observable<unknown>) =>
  new Observable<'completed'>(subscriber => {
    subscriber.add(
      stream.subscribe({
        complete: () => {
          subscriber.next('completed');
          subscriber.complete();
        },
        error: err => {
          subscriber.error(err);
        },
      })
    );
  });
