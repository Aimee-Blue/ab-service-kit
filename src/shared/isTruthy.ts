export function isTruthy<T>(
  value: NonNullable<T> | undefined | null | false
): value is NonNullable<T> {
  return !!value;
}
