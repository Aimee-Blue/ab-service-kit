import WebSocket from 'ws';
import { Observable, empty, of } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';
import { Channels } from '@aimee-blue/ab-shared';
import * as Joi from 'joi';
import { isString, tryParse } from './helpers';

export const actionStreamFromSocket = <T extends { type: string }>(
  data: Observable<WebSocket.Data>,
  actionSchemaByType = Channels.actionSchemaByType
) => {
  return data.pipe(
    filter(isString),
    mergeMap(nonParsed => {
      const value = tryParse<T>(nonParsed);
      if (value === null) {
        return empty();
      }

      if (typeof value !== 'object' || !('type' in value)) {
        console.error('💥  No type property in incoming message');
        return empty();
      }

      const schema = actionSchemaByType(value.type);

      if (!schema) {
        console.error('💥  No schema found for type', value.type);
        return empty();
      }

      const result = Joi.validate(value, schema);

      if (result.error as Error | null) {
        console.error('💥  Invalid message of type', value.type);
        return empty();
      }

      return of(result.value);
    })
  );
};
