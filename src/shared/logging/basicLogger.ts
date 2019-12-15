/**
 * Creates new logger instance, use `defaultBasicLogger` instead if you want
 * to share same instance as everyone else are sharing
 */
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

let logger: BasicLogger | undefined;

export const defaultBasicLogger = () => {
  if (logger) {
    return logger;
  }
  return (logger = createBasicLogger());
};

export const setDefaultBasicLogger = (newLogger: BasicLogger) => {
  // tslint:disable-next-line: strict-boolean-expressions
  if (!newLogger) {
    throw new Error('Logger should be defined');
  }
  logger = newLogger;
};
