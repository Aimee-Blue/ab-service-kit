import { tag } from 'rxjs-spy/operators';
import { Observable } from 'rxjs';
import util from 'util';

export function createNoOpLogger() {
  return Object.freeze({
    log: (..._parameters: unknown[]) => {
      return;
    },
    warn: (..._parameters: unknown[]) => {
      return;
    },
    error: (..._parameters: unknown[]) => {
      return;
    },
  });
}

export function createLogger() {
  return Object.freeze({
    log: (message?: unknown, ...parameters: unknown[]) => {
      console.log(message, ...parameters);
    },
    warn: (message?: unknown, ...parameters: unknown[]) => {
      console.warn(message, ...parameters);
    },
    error: (message?: unknown, ...parameters: unknown[]) => {
      console.error(message, ...parameters);
    },
  });
}

export const defaultLogger = createLogger();

export type Logger = ReturnType<typeof createLogger>;

export type LogArgs = Parameters<Logger['log']>;

export type LoggerWithSuffix = Logger &
  Readonly<{
    withTag: (suffix: unknown) => LoggerWithSuffix;
    parent: Logger;
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

function isTaggedLogger(logger: Logger): logger is LoggerWithSuffix {
  return (
    logger !== null &&
    typeof logger === 'object' &&
    'withSuffix' in logger &&
    'parent' in logger
  );
}

function taggedLoggerFactory(parent: Logger, suffixes: unknown[] = []) {
  return (additional: unknown): LoggerWithSuffix => {
    suffixes.push(additional);
    const locked = [...suffixes];
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
      withTag: arg => {
        return taggedLoggerFactory(parent, suffixes)(arg);
      },
      parent,
    });
  };
}

export function createTaggedLogger(
  suffix: unknown,
  parent?: Logger
): LoggerWithSuffix {
  if (parent && isTaggedLogger(parent)) {
    return parent.withTag(suffix);
  }

  const factory = taggedLoggerFactory(parent || createLogger());

  return factory(suffix);
}

export function createTaggedRxJsSpyTagOperator(
  suffix: unknown,
  parent: typeof tag = tag
) {
  return (text: string) => <T>(stream: Observable<T>) =>
    stream.pipe(parent(util.format(text, suffix)));
}
