import { OperatorFunction, Observable } from 'rxjs';

const noOp = <T>(stream: Observable<T>) => stream;

export function conditionalOperator<
  Op extends (...args: unknown[]) => OperatorFunction<unknown, unknown>
>(condition: boolean, op: Op) {
  if (condition) {
    return op;
  } else {
    return <K>(..._args: Parameters<Op>) => noOp as OperatorFunction<K, K>;
  }
}
