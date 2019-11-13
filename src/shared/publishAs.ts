import { Observable } from 'rxjs';
import { publishStream } from './publishStream';

export function publishAs<T, U extends Record<string, Observable<unknown>>>(
  stream: Observable<T>,
  transform: (shared: Observable<T>) => U
): U {
  const shared = publishStream(stream);
  const transformed = transform(shared);
  shared.connect();
  return transformed;
}
