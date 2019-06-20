import { IAction } from './action';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

export function isOfType<T extends IAction>(
  type: T['type'],
  action: T | IAction
): action is T {
  return action.type === type;
}

export function ofType<T extends IAction>(type: T['type']) {
  const filterFn = isOfType.bind(undefined, type);
  return (stream: Observable<T | IAction>) => {
    return stream.pipe(filter(filterFn)) as Observable<T>;
  };
}
