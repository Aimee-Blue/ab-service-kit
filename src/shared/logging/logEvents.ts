import { OperatorFunction } from 'rxjs';
import { BasicLogger, defaultBasicLogger } from './basicLogger';
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
  tags?: unknown[];
  suffix?: unknown[];
}

export interface ILogStreamParamsCore extends ILogTextParams {
  on?: LogNotification[];
  logger?: BasicLogger;
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

const buildSimpleLog = <T>(
  paramsRaw: LogStreamParams & { logger: BasicLogger }
) => {
  return (info: NotificationInfo<T, 'audit'>) => {
    const params = {
      ...paramsRaw,
      ...paramsRaw[info.notification],
    };

    try {
      const description = [
        params.prefix,
        `(${info.notification})`,
        ...(params.tags || []),
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

const buildAuditLog = <T>(
  paramsRaw: LogStreamParams & { logger: BasicLogger }
) => (info: NotificationInfo<T, 'audit'>) => {
  try {
    const params = {
      ...paramsRaw,
      ...paramsRaw[info.notification],
    };

    const description = [params.prefix, ...(params.tags || [])];

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

export type LogEventsArg = LogStreamParams | string;

export function logEventsParams(
  arg: LogEventsArg,
  defaultLogger = defaultBasicLogger
): LogStreamParams & { logger: BasicLogger } {
  return {
    logger: defaultLogger,
    ...(typeof arg === 'string'
      ? {
          prefix: arg,
        }
      : arg),
  };
}

export function logEvents<T>(paramsRaw: LogEventsArg): OperatorFunction<T, T> {
  const params = logEventsParams(paramsRaw);

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

export type LogEventsOperator = typeof logEvents;

function taggedLogEventsFactory(
  startWith: unknown[] = [],
  logger: BasicLogger = defaultBasicLogger,
  fn: LogEventsOperator = logEvents
) {
  const tags = [...startWith];
  const taggedlogEvents = <T>(paramsRaw: LogEventsArg) => {
    const params = logEventsParams(paramsRaw, logger);
    return fn<T>({
      ...params,
      tags: [...(params.tags ?? []), ...tags],
    });
  };
  taggedlogEvents.withTags = (...extraTags: unknown[]) => {
    return taggedLogEventsFactory([...tags, ...extraTags], logger, fn);
  };
  return taggedlogEvents;
}

export function createTaggedLogEvents(
  tags: unknown[],
  logger = defaultBasicLogger
) {
  return taggedLogEventsFactory(tags, logger);
}

export type TaggedLogEventsOperator = ReturnType<typeof createTaggedLogEvents>;
