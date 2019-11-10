import WebSocket from 'ws';
import { registerError } from '../registerError';
import { Logger } from '../logging';

export const isBuffer = (value: WebSocket.Data): value is Buffer => {
  return value instanceof Buffer;
};

export const isString = (value: WebSocket.Data): value is string => {
  return typeof value === 'string';
};

export const tryParse = <T>(text: string, logger: Logger): T | null => {
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    registerError(err);
    logger.error('💥  Cannot parse incoming message', err);
    return null;
  }
};
