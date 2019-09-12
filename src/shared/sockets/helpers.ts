import WebSocket from 'ws';

export const isBuffer = (value: WebSocket.Data): value is Buffer => {
  return value instanceof Buffer;
};

export const isString = (value: WebSocket.Data): value is string => {
  return typeof value === 'string';
};

export const tryParse = <T>(text: string): T | null => {
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    console.error('💥  Cannot parse incoming message', err);
    return null;
  }
};
