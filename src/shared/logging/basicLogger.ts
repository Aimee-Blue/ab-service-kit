export function createBasicLogger() {
  return Object.freeze({
    log: (message?: unknown, ...parameters: unknown[]) => {
      console.log(message, ...parameters);
    },
    warn: (message?: unknown, ...parameters: unknown[]) => {
      console.warn(message, ...parameters);
    },
    error: (message?: unknown, ...parameters: unknown[]) => {
      console.error(message, ...parameters);
    },
  });
}

export function createNoOpBasicLogger(): BasicLogger {
  return Object.freeze({
    log: (..._parameters: unknown[]) => {
      return;
    },
    warn: (..._parameters: unknown[]) => {
      return;
    },
    error: (..._parameters: unknown[]) => {
      return;
    },
  });
}

export type BasicLogger = ReturnType<typeof createBasicLogger>;

export const defaultBasicLogger = createBasicLogger();
