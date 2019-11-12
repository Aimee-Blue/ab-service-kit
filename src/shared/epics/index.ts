import { pingsEpic } from './pings';

export * from './pings';
export * from './reportErrorsToCloud';
export * from './defaultBackground';

export function defaultSocketsMap() {
  return {
    '/ping': pingsEpic,
  };
}
