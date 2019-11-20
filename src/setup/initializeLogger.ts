import {
  IServiceConfig,
  defaultBasicLogger,
  setDefaultBasicLogger,
} from '../shared';

export async function initializeLoggerOrFallback(config: IServiceConfig) {
  try {
    const logger = await (config.logger?.() ||
      Promise.resolve(defaultBasicLogger()));
    setDefaultBasicLogger(logger);
    return logger;
  } catch (err) {
    const fallback = defaultBasicLogger();
    fallback.error('💥  Exception when initializing logger', err);
    return fallback;
  }
}
