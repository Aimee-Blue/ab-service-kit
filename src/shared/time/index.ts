import { serverTime } from './serverTime';
import { registerError } from '../registerError';
import { defaultBasicLogger } from '../logging';

// in the docs is mentioned that `hrtime` is more stable
// that the Date.now and doesn't drift, so we use it to
// determine current local time, also it gives us nanosecond precision
let initialNow = Date.now();
let initialHr = process.hrtime();
let initialDiff = Date.now() - quickNowWithMicroseconds();

// microsecond precision, as there is simply no room for nanos in JavaScript number
function quickNowWithMicroseconds() {
  const [seconds, nanoseconds] = process.hrtime(initialHr);
  const result = initialNow + seconds * 1e3 + nanoseconds / 1e6;
  return result;
}

// it is possible that the VM sleeps (typically on local dev desktop)
// so we need to reinitialize the time
export function reInitializeTime() {
  const oldDiff = initialDiff;

  initialNow = Date.now();
  initialHr = process.hrtime();
  initialDiff = Date.now() - quickNowWithMicroseconds();

  const logger = defaultBasicLogger();

  logger.log('💡  Re-initializing time', {
    oldDiff,
    newDiff: initialDiff,
  });
}

export function localNow() {
  const result = quickNowWithMicroseconds();

  // reinitialize after clock synchronizations and hibernation's
  const diff = Math.abs(Date.now() - result - initialDiff);
  if (diff > 10) {
    reInitializeTime();
    return quickNowWithMicroseconds();
  }

  return result;
}

const defaultDeps = {
  determineTime: serverTime,
};

let serverTimeInfo: {
  offset: number;
  took: number;
} | null = null;

let promise: Promise<number> | null = null;

export const time = (deps = defaultDeps) => {
  if (!process.env.TIME_URL) {
    return Promise.resolve(localNow());
  }

  if (serverTimeInfo !== null) {
    return Promise.resolve(localNow() - serverTimeInfo.offset);
  }

  const logger = defaultBasicLogger();

  return (
    promise ||
    (promise = deps
      .determineTime()
      .then(() => {
        const start = localNow();
        return deps.determineTime().then(result => {
          const stop = localNow();
          const took = stop - start;

          // the right time is somewhere in between
          serverTimeInfo = {
            offset: localNow() - result,
            took,
          };
          promise = null;

          logger.log(
            '⏰  Time synchronized, it took',
            took,
            'offset is',
            serverTimeInfo.offset
          );

          return localNow() - serverTimeInfo.offset;
        });
      })
      .catch(err => {
        registerError(err);
        promise = null;

        logger.error('💥  Error when synchronizing time', err);
        return localNow();
      }))
  );
};
