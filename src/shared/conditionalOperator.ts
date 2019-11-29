import { OperatorFunction, Observable, ObservedValueOf } from 'rxjs';

const noOp = <T>(stream: Observable<T>) => stream;

type IsEqualTypes<L, R> = L extends R ? (R extends L ? true : never) : never;

type InputStreamValueType<
  T extends (...args: unknown[]) => OperatorFunction<unknown, unknown>
> = ObservedValueOf<Parameters<ReturnType<T>>[0]>;

type OutputStreamValueType<
  T extends (...args: unknown[]) => OperatorFunction<unknown, unknown>
> = ObservedValueOf<ReturnType<ReturnType<T>>>;

type IdentityOp<
  T extends (...args: unknown[]) => OperatorFunction<unknown, unknown>
> = (
  ..._args: Parameters<T>
) => OperatorFunction<InputStreamValueType<T>, InputStreamValueType<T>>;

type ConditionalOperatorReturnType<
  Op extends (...args: unknown[]) => OperatorFunction<unknown, unknown>
> = IsEqualTypes<
  InputStreamValueType<Op>,
  OutputStreamValueType<Op>
> extends true
  ? Op
  : Op | IdentityOp<Op>;

export function conditionalOperator<
  Op extends (...args: unknown[]) => OperatorFunction<unknown, unknown>
>(condition: boolean, op: Op): ConditionalOperatorReturnType<Op> {
  if (condition) {
    return op as ConditionalOperatorReturnType<Op>;
  } else {
    return ((..._args: Parameters<Op>) =>
      noOp) as ConditionalOperatorReturnType<Op>;
  }
}
