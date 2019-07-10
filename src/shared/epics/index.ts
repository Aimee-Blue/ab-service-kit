import { pingsEpic } from './pings';

export * from './pings';

export function defaultSocketsMap() {
  return {
    '/ping': pingsEpic,
  };
}
