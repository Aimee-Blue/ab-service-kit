import { OperatorFunction, Observable } from 'rxjs';

const noOp = <T>(stream: Observable<T>) => stream;

export function conditionalOperator<A extends unknown[], T, R = T>(
  condition: boolean,
  op: (...args: A) => OperatorFunction<T, R>
) {
  if (condition) {
    return op;
  } else {
    return (..._args: A) => noOp as OperatorFunction<T, T>;
  }
}
