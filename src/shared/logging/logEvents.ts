import { OperatorFunction, Observable, merge, isObservable } from 'rxjs';
import { BasicLogger, defaultBasicLogger } from './basicLogger';
import {
  TagNotification,
  executeOnNotifications,
  NotificationInfo,
} from '../notifications';
import { registerError } from '../registerError';
import { onLoggingAudit } from './loggingAuditAction';
import { mapTo, ignoreElements, publish } from 'rxjs/operators';

export type LogNotification = TagNotification | 'audit';

export interface ILogTextParams {
  prefix: string;
  tags?: unknown[];
  suffix?: unknown[];
}

export type LogOn<K extends string = string> = Array<
  LogNotification | Observable<K>
>;

export interface ILogStreamParamsCore<T> extends ILogTextParams {
  on?: LogOn;
  project?: <Y>(stream: Observable<T>) => Observable<Y>;
  logger?: BasicLogger;
}

export type LogTextParamsMap = Partial<Record<LogNotification, ILogTextParams>>;

export type LogStreamParams<T> = ILogStreamParamsCore<T> & LogTextParamsMap;

function isTagNotification(
  notification: LogNotification
): notification is TagNotification {
  return notification !== 'audit';
}

function isLogNotification(
  notification: LogNotification | Observable<string>
): notification is TagNotification {
  return typeof notification === 'string';
}

function tagsFromLogOn(notifications: LogOn): TagNotification[] {
  return notifications.filter(isTagNotification);
}

function logOnFromParam(on?: LogOn): LogOn {
  if (Array.isArray(on)) {
    const set = new Set<LogNotification>(on.filter(isLogNotification));
    return [...set, on.filter(entry => !isLogNotification(entry))] as LogOn;
  } else {
    // default:
    return ['next', 'error', 'complete', 'subscribe', 'unsubscribe'];
  }
}

const buildSimpleLog = <T>(
  paramsRaw: LogStreamParams<T> & { logger: BasicLogger }
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
      params.logger.error('💥  Something bad happened when logging', err);
    }
  };
};

const buildAuditLog = <T>(
  paramsRaw: LogStreamParams<T> & { logger: BasicLogger }
) => (info: NotificationInfo<T, 'audit'>) => {
  const params = {
    ...paramsRaw,
    ...paramsRaw[info.notification],
  };

  try {
    const description = [params.prefix, ...(params.tags || [])];

    switch (info.notification) {
      case 'audit':
        if (!info.lastValue) {
          break;
        }
        params.logger.log(
          ...description,
          'last-observed:',
          info.lastValue,
          ...(params.suffix ?? [])
        );
        break;
      case 'unsubscribe':
        params.logger.log(
          ...description,
          'last-observed:',
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
    params.logger.error('💥  Something bad happened when logging', err);
  }
};

export type LogEventsArg<T> = LogStreamParams<T> | string;

export function logEventsParams<T>(
  arg: LogEventsArg<T>,
  defaultLogger = defaultBasicLogger()
): LogStreamParams<T> & { logger: BasicLogger } {
  return {
    logger: defaultLogger,
    ...(typeof arg === 'string'
      ? {
          prefix: arg,
        }
      : arg),
  };
}

export function logEvents<T>(
  paramsRaw: LogEventsArg<T>
): OperatorFunction<T, T> {
  const params = logEventsParams<T>(paramsRaw);

  const project = params.project;
  const logOn = logOnFromParam(params.on);
  const tags = tagsFromLogOn(logOn);
  const observables = logOn.filter(isObservable) as Array<Observable<string>>;

  // When the triggering event is another observable we want to
  // log the latest value from source stream
  const operator =
    logOn.includes('audit') || observables.length > 0
      ? executeOnNotifications(
          [
            ...tags,
            ...observables,
            onLoggingAudit().pipe(mapTo('audit' as const)),
          ],
          buildAuditLog<T>(params),
          params.logger
        )
      : executeOnNotifications(tags, buildSimpleLog<T>(params), params.logger);

  if (!project) {
    return stream => stream.pipe(operator);
  } else {
    return stream =>
      stream.pipe(
        publish(shared =>
          merge(shared, shared.pipe(project, operator, ignoreElements()))
        )
      );
  }
}

export type LogEventsOperator<T> = (
  paramsRaw: LogEventsArg<T>
) => OperatorFunction<T, T>;

function taggedLogEventsFactory(
  startWith: unknown[] = [],
  logger: BasicLogger = defaultBasicLogger(),
  fn = logEvents
) {
  const tags = [...startWith];
  const taggedlogEvents = <T>(paramsRaw: LogEventsArg<T>) => {
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
  logger = defaultBasicLogger()
) {
  return taggedLogEventsFactory(tags, logger);
}

export type TaggedLogEventsOperator = ReturnType<typeof createTaggedLogEvents>;
