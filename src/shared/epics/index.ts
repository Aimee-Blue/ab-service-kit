import { pingsEpic } from './pings';

export * from './pings';
export * from './cloudError';

export function defaultSocketsMap() {
  return {
    '/ping': pingsEpic,
  };
}
