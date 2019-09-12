import WebSocket from 'ws';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { isBuffer } from './helpers';

export const binaryStreamFromSocket = (data: Observable<WebSocket.Data>) => {
  return data.pipe(filter(isBuffer));
};
