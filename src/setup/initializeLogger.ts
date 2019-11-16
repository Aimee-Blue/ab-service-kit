import { IServiceConfig, defaultBasicLogger } from '../shared';

export async function initializeLoggerOrFallback(config: IServiceConfig) {
  try {
    return await (config.logger?.() || Promise.resolve(defaultBasicLogger()));
  } catch (err) {
    const fallback = defaultBasicLogger();
    fallback.error('💥  Exception when initializing logger', err);
    return fallback;
  }
}
