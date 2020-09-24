import WebSocket from 'ws';
import { Observable, EMPTY, of } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';
import { Channels } from '@aimee-blue/ab-contracts';
import * as Joi from 'joi';
import { isString, tryParse } from './helpers';
import { Logger, defaultLogger } from '../logging';

function defaultActionSchemaByType(type: string): Joi.ObjectSchema | null {
  const schema = Channels.actionSchemaByType(type);
  if (!schema) {
    return null;
  }

  const fullSchema = Channels.partialMessageSchema(schema);

  return fullSchema;
}

export const actionStreamFromSocket = <
  T extends { type: string; payload: unknown }
>(
  data: Observable<WebSocket.Data>,
  actionSchemaByType = defaultActionSchemaByType,
  logger: Logger = defaultLogger
) => {
  return data.pipe(
    filter(isString),
    mergeMap((nonParsed) => {
      const value = tryParse<T>(nonParsed, logger);
      if (value === null) {
        return EMPTY;
      }

      if (typeof value !== 'object' || !('type' in value)) {
        logger.error('💥  No type property in incoming message');
        return EMPTY;
      }

      const schema = actionSchemaByType(value.type);
      if (!schema) {
        logger.error('💥  No schema found for type', value.type);
        return EMPTY;
      }

      const result = schema.validate(value);
      if (result.error) {
        logger.error('💥  Invalid message of type', value.type, result.error);
        return EMPTY;
      }

      return of(result.value as T);
    })
  );
};
