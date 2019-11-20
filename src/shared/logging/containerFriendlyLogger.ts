import { BasicLogger, createBasicLogger } from '.';
import util from 'util';

export function trimWhitespace(arg: unknown) {
  if (typeof arg === 'string') {
    return arg
      .replace(/^(\s*\n\s*|\s)+/gu, '')
      .replace(/(\s*\n\s*|\s)+$/gu, '');
  }
  return arg;
}

export function isNotEmptyOrLineBreak(arg: unknown) {
  if (typeof arg === 'string') {
    const trimmed = arg;
    if (trimmed.length === 0) {
      return false;
    }
  }
  return true;
}

const allowedTypes = ['string', 'number', 'boolean'];

export function transformValue(arg: unknown) {
  if (allowedTypes.includes(typeof arg)) {
    return arg;
  }
  return util.inspect(arg, {
    compact: true,
    colors: false,
    depth: 3,
  });
}

export function friendlyLogEntry(...args: unknown[]) {
  return JSON.stringify(
    args
      .map(trimWhitespace)
      .filter(isNotEmptyOrLineBreak)
      .map(transformValue)
  );
}

/**
 * Converts the whole logging entry into a single JSON string which
 * makes this compatible with Docker and allow multiline data like
 * exceptions to be retained within same log entry.
 */
export const createContainerFriendlyLogger = (): BasicLogger => {
  const logger = createBasicLogger();
  return Object.freeze({
    log: (...args: unknown[]) => logger.log(friendlyLogEntry(...args)),
    warn: (...args: unknown[]) => logger.warn(friendlyLogEntry(...args)),
    error: (...args: unknown[]) => logger.error(friendlyLogEntry(...args)),
  });
};
