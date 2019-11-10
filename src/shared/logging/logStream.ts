import { OperatorFunction } from 'rxjs';
import { Logger, defaultLogger } from './logger';
import {
  TagNotification,
  executeOnNotifications,
  NotificationInfo,
} from '../notifications';
import { registerError } from '../registerError';
import { onLoggingAudit } from './loggingAuditAction';
import { mapTo } from 'rxjs/operators';

export type LogNotification = TagNotification | 'audit';

export interface ILogTextParams {
  prefix: string;
  extra?: unknown[];
  suffix?: unknown[];
}

export interface ILogStreamParamsCore extends ILogTextParams {
  on?: LogNotification[];
  logger?: Logger;
}

export type LogTextParamsMap = Partial<Record<LogNotification, ILogTextParams>>;

export type LogStreamParams = ILogStreamParamsCore & LogTextParamsMap;

function isTagNotification(
  notification: LogNotification
): notification is TagNotification {
  return notification !== 'audit';
}

function tagsFromLogOn(notifications: LogNotification[]): TagNotification[] {
  return notifications.filter(isTagNotification);
}

function logOnFromParam(on: ILogStreamParamsCore['on']): LogNotification[] {
  if (Array.isArray(on)) {
    const set = new Set<LogNotification>(on);
    return [...set];
  } else {
    // default:
    return ['next', 'error', 'complete', 'subscribe', 'unsubscribe'];
  }
}

const buildSimpleLog = <T>(paramsRaw: LogStreamParams & { logger: Logger }) => {
  return (info: NotificationInfo<T, 'audit'>) => {
    const params = {
      ...paramsRaw,
      ...paramsRaw[info.notification],
    };

    try {
      const description = [
        params.prefix,
        `(${info.notification})`,
        ...(params.extra || []),
      ];

      switch (info.notification) {
        case 'next':
          params.logger.log(
            ...description,
            info.value,
            ...(params.suffix ?? [])
          );
          break;
        case 'error':
          params.logger.error(
            ...description,
            info.error,
            ...(params.suffix ?? [])
          );
          break;
        default:
          params.logger.log(...description, ...(params.suffix ?? []));
          break;
      }
    } catch (err) {
      registerError(err);
      console.error('💥  Something bad happened when logging', err);
    }
  };
};

const buildAuditLog = <T>(paramsRaw: LogStreamParams & { logger: Logger }) => (
  info: NotificationInfo<T, 'audit'>
) => {
  try {
    const params = {
      ...paramsRaw,
      ...paramsRaw[info.notification],
    };

    const description = [params.prefix, ...(params.extra || [])];

    switch (info.notification) {
      case 'audit':
        if (!info.lastValue) {
          break;
        }
        params.logger.log(
          ...description,
          info.lastValue,
          ...(params.suffix ?? [])
        );
        break;
      case 'unsubscribe':
        params.logger.log(
          ...description,
          info.lastValue,
          ...(params.suffix ?? [])
        );
        break;
      case 'next':
        params.logger.log(...description, info.value, ...(params.suffix ?? []));
        break;
      case 'error':
        params.logger.log(...description, info.error, ...(params.suffix ?? []));
        break;
      default:
        params.logger.log(...description, ...(params.suffix ?? []));
        break;
    }
  } catch (err) {
    registerError(err);
    console.error('💥  Something bad happened when logging', err);
  }
};

export function logStream<T>(
  paramsRaw: LogStreamParams | string
): OperatorFunction<T, T> {
  const params = {
    logger: defaultLogger,
    ...(typeof paramsRaw === 'string'
      ? {
          prefix: paramsRaw,
        }
      : paramsRaw),
  };

  const logOn = logOnFromParam(params.on);
  const tags = tagsFromLogOn(logOn);

  if (logOn.includes('audit')) {
    return stream =>
      stream.pipe(
        executeOnNotifications(
          [...tags, onLoggingAudit().pipe(mapTo('audit' as const))],
          buildAuditLog<T>(params)
        )
      );
  } else {
    return stream =>
      stream.pipe(executeOnNotifications(tags, buildSimpleLog<T>(params)));
  }
}
