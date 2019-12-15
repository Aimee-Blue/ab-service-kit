import {
  logEvents,
  LogEventsArg,
  logEventsParams,
  createTaggedLogEvents,
  TaggedLogEventsOperator,
} from './logEvents';
import {
  createNoOpBasicLogger,
  BasicLogger,
  defaultBasicLogger,
} from './basicLogger';
import { Observable } from 'rxjs';

export function createLogger(basicLogger = defaultBasicLogger()) {
  return Object.freeze({
    ...basicLogger,
    logEvents: <T, Y>(arg: LogEventsArg<T, Y>) =>
      logEvents<T, Y>(logEventsParams(arg, basicLogger)),
  });
}

export function createNoOpLogger(): Logger {
  const basicLogger = createNoOpBasicLogger();
  return Object.freeze({
    ...basicLogger,
    logEvents: <T, Y>(_arg: LogEventsArg<T, Y>) => (stream: Observable<T>) =>
      stream,
  });
}

export const defaultLogger = createLogger();

export type Logger = ReturnType<typeof createLogger>;

export type LogArgs = Parameters<Logger['log']>;

export type TaggedLogger = Logger &
  Readonly<{
    logEvents: TaggedLogEventsOperator;
    withTags: (...tags: unknown[]) => TaggedLogger;
    parent: BasicLogger;
  }>;

function splitFirstLineAndBody(text: string) {
  // empty or whitespace only?
  if (/^\s*$/u.test(text)) {
    return [text, ''];
  }

  const firstLineAndRest = /^(\s*([^\s\n]+[^\n]*)+)(.*)/u;

  const result = firstLineAndRest.exec(text);

  if (!result) {
    return [text, ''];
  }

  return [result[1], result[3]];
}

function determineTagsInjectionPoint(
  args: unknown[]
): readonly [unknown[], unknown[]] {
  const emptyOrWhitespace = /^\s*$/u;

  const injectAt = args.findIndex(arg => {
    if (typeof arg === 'string' && emptyOrWhitespace.test(arg)) {
      return false;
    }
    return true;
  });

  if (injectAt === -1) {
    return [args, [] as unknown[]] as const;
  }

  const beforeArgs = args.slice(0, injectAt);
  const injectAtArg = args[injectAt];
  const afterArgs = args.slice(injectAt + 1);

  if (typeof injectAtArg === 'string') {
    const [firstLine, rest] = splitFirstLineAndBody(injectAtArg);
    return [
      firstLine ? [...beforeArgs, firstLine] : beforeArgs,
      rest ? [rest, ...afterArgs] : afterArgs,
    ] as const;
  }

  return [beforeArgs, [injectAtArg, ...afterArgs]];
}

function appendTags(args: LogArgs, tags: unknown[]) {
  const [before, after] = determineTagsInjectionPoint(args);
  return [...before, ...tags, ...after];
}

function isTaggedLogger(logger: BasicLogger): logger is TaggedLogger {
  return (
    logger !== null &&
    typeof logger === 'object' &&
    'withTags' in logger &&
    'parent' in logger
  );
}

function taggedLoggerFactory(
  parent: BasicLogger,
  startWith: unknown[] = []
): TaggedLogger {
  const locked = [...startWith];
  return Object.freeze({
    log: (...args) => {
      parent.log(...appendTags(args, locked));
    },
    warn: (...args) => {
      parent.warn(...appendTags(args, locked));
    },
    error: (...args) => {
      parent.error(...appendTags(args, locked));
    },
    withTags: (...args) => {
      return taggedLoggerFactory(parent, [...locked, ...args]);
    },
    logEvents: createTaggedLogEvents(startWith, parent),
    parent,
  });
}

export function createTaggedLogger(
  tags: unknown[],
  parent?: BasicLogger
): TaggedLogger {
  if (parent && isTaggedLogger(parent)) {
    return parent.withTags(...tags);
  }

  return taggedLoggerFactory(parent || defaultBasicLogger(), tags);
}

export function createNoOpTaggedLogger() {
  return createTaggedLogger([], createNoOpLogger());
}
