import { pingsEpic } from './pings';

export * from './pings';
export * from './cloudError';
export * from './defaultBackground';

export function defaultSocketsMap() {
  return {
    '/ping': pingsEpic,
  };
}
