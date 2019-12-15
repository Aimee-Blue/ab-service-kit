import { Subject, Observable } from 'rxjs';

export const pushToSubject = <T>(subject: Subject<T>) => (
  stream: Observable<T>
): Observable<never> =>
  new Observable<never>(subscriber => {
    subscriber.add(
      stream.subscribe({
        next: data => subject.next(data),
        error: err => subscriber.error(err),
        complete: () => subscriber.complete(),
      })
    );
  });
