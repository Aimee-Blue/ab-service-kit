import { Observable, Subject } from 'rxjs';
import { ignoreElements, tap, filter, scan, map } from 'rxjs/operators';
import { EOL } from 'os';
import { TagNotification, executeOnNotifications } from '../notifications';
import {
  Logger,
  defaultLogger,
  logEvents,
  BasicLogger,
  defaultBasicLogger,
  LogOn,
} from '../logging';

type Timestamp = [number, number];

interface IDetails {
  [key: string]: string | number | boolean;
}

interface ITagState {
  hitTime?: Timestamp;
}

function timestampToTime(timestamp: Timestamp, since?: Timestamp) {
  if (since) {
    const time = process.hrtime(since);
    return time[0] * 1e3 + time[1] / 1e6;
  } else {
    return timestamp[0] * 1e3 + timestamp[1] / 1e6;
  }
}

const allHits = new Subject<{ name: string; timestamp: Timestamp }>();

const allMemos = new Subject<{
  name: string;
  time: number;
  details?: IDetails;
}>();

const allSummaries = new Subject<{ name: string; summary: ISummary }>();

const defaultDeps = {
  timestamp: () => process.hrtime(),
  timestampDiff: (timestamp: Timestamp) => process.hrtime(timestamp),
};

function createInitialState(deps = defaultDeps): IState {
  const stateByTag = new Map<string, ITagState>();

  const createStateForTag = (): ITagState => {
    return {};
  };

  const self = Object.freeze({
    hit: (name: string) => {
      const state = stateByTag.get(name) || createStateForTag();

      state.hitTime = deps.timestamp();
      allHits.next({
        name,
        timestamp: state.hitTime,
      });

      stateByTag.set(name, state);
    },
    memo: (
      name: string,
      details?: IDetails,
      determine: (metric: number) => number = value => value
    ): number | null => {
      const state = stateByTag.get(name);
      if (!state || !state.hitTime) {
        return null;
      }

      const timeSinceHit = determine(
        timestampToTime(deps.timestampDiff(state.hitTime))
      );

      allMemos.next({
        name,
        time: timeSinceHit,
        ...(details && {
          details,
        }),
      });

      stateByTag.set(name, state);

      return timeSinceHit;
    },
  });
  return self;
}

function sortedPush(value: number, items: number[]) {
  const index = items.findIndex(item => item > value);
  if (index === -1) {
    items.push(value);
  } else {
    items.splice(index, 0, value);
  }
  return items;
}

function isMatch(name: string, to: string | RegExp) {
  return (
    (typeof to === 'string' && to === name) ||
    (typeof to === 'object' && to.test(name))
  );
}

function createSummary(name: string | RegExp): Observable<ISummary> {
  const MAX_MEMOS = 100;

  return allMemos.asObservable().pipe(
    //
    filter(item => isMatch(item.name, name)),
    scan(
      (acc, item) => {
        const memos = [...acc.memos, item.time].slice(-MAX_MEMOS);
        const sortedMemos = sortedPush(item.time, acc.sortedMemos);
        return {
          ...acc,
          memos,
          sortedMemos,
          max: Math.max(acc.max, item.time),
          min: Math.min(acc.min, item.time),
          average: Number.isNaN(acc.average)
            ? item.time
            : (acc.average + item.time) / 2,
          mostOfTheTimesLessThan: quantile(sortedMemos, 90),
        };
      },
      {
        sortedMemos: [] as number[],
        memos: [] as number[],
        max: 0,
        min: Number.MAX_SAFE_INTEGER,
        average: NaN,
        mostOfTheTimesLessThan: NaN,
      }
    ),
    map(item => ({
      numberOfSamples: item.memos.length,
      max: item.max,
      min: item.min,
      average: item.average,
      mostOfTheTimesLessThan: item.mostOfTheTimesLessThan,
    }))
  );
}

interface IState {
  hit(name: string): void;
  memo(
    name: string,
    details?: IDetails,
    transformTookTime?: (metric: number) => number
  ): number | null;
}

let cachedState: IState | null = null;

function globalState() {
  if (cachedState) {
    return cachedState;
  }

  return (cachedState = createInitialState());
}

export function createState(deps = defaultDeps) {
  return createInitialState(deps);
}

export function attach(params: {
  name: string;
  from: TagNotification;
  till: TagNotification;
  cb?: (value: number) => void;
  details?: IDetails;
  transformTimeTook?: (value: number) => number;
  state?: IState;
}) {
  return <T>(source: Observable<T>) => {
    const effectiveState = params.state || createInitialState();

    const startOp = () =>
      start({ name: params.name, on: params.from }, effectiveState);

    const stopOp = () =>
      stop(
        {
          name: params.name,
          till: params.till,
          cb: params.cb,
          transformTookTime: params.transformTimeTook,
          details: params.details,
        },
        effectiveState
      );

    return source.pipe(stream => {
      if (params.till === 'unsubscribe' && params.from === 'complete') {
        return stream.pipe(startOp(), stopOp());
      } else {
        return stream.pipe(stopOp(), startOp());
      }
    });
  };
}

export function registerStarts(
  params: {
    name: string;
    on: Observable<unknown>;
  },
  state = globalState()
) {
  const hit = () => {
    state.hit(params.name);
  };

  return params.on.pipe(tap(hit), ignoreElements());
}

export function start(
  paramsRaw: {
    name: string;
    on?: TagNotification;
    logger?: BasicLogger;
  },
  state = globalState()
) {
  const params = {
    on: 'next' as const,
    ...paramsRaw,
  };
  return <T>(stream: Observable<T>) => {
    const hit = () => {
      state.hit(params.name);
    };

    return stream.pipe(
      executeOnNotifications(
        [params.on],
        hit,
        params.logger ?? defaultBasicLogger()
      )
    );
  };
}

export function registerStops(
  params: {
    name: string;
    on: Observable<unknown>;
    details?: IDetails;
    cb?: (time: number) => void;
    transformTookTime?: (time: number) => number;
  },
  state = globalState()
) {
  const setMemo = () => {
    const timeTook = state.memo(
      params.name,
      params.details,
      params.transformTookTime
    );
    if (typeof timeTook === 'number' && params.cb) {
      params.cb(timeTook);
    }
  };
  return params.on.pipe(tap(setMemo), ignoreElements());
}

export function stop(
  paramsRaw: {
    name: string;
    till: TagNotification;
    details?: IDetails;
    cb?: (time: number) => void;
    transformTookTime?: (time: number) => number;
    logger?: BasicLogger;
  },
  state = globalState()
) {
  const params = {
    till: 'next' as const,
    ...paramsRaw,
  };
  return <T>(stream: Observable<T>) => {
    const setMemo = () => {
      const timeTook = state.memo(
        params.name,
        params.details,
        params.transformTookTime
      );
      if (typeof timeTook === 'number' && params.cb) {
        params.cb(timeTook);
      }
    };
    return stream.pipe(
      executeOnNotifications(
        [params.till],
        setMemo,
        params.logger ?? defaultBasicLogger()
      )
    );
  };
}

function quantile(
  input: number[],
  percentile: number,
  params?: { sorted: boolean }
) {
  const array = params && params.sorted ? input : input.slice().sort();

  const index = (percentile / 100) * (array.length - 1);
  const i = Math.floor(index);
  if (i === index) {
    return array[index];
  } else {
    return array[i] + (array[i + 1] - array[i]) / 2;
  }
}

interface ISummary {
  numberOfSamples: number;
  average: number;
  mostOfTheTimesLessThan: number;
  min: number;
  max: number;
}

export function logSummaries(params: {
  name: string;
  on?: LogOn;
  logger?: Logger;
}) {
  const summaries = createSummary(params.name);
  const logger = params.logger ?? defaultLogger;

  return summaries.pipe(
    logEvents({
      prefix: `${EOL}🔃  Profiler results for [${params.name}]`,
      suffix: [EOL],
      logger,
      ...(params.on && {
        on: params.on,
      }),
    }),
    ignoreElements()
  );
}

export function timesRegistered(name?: string | RegExp) {
  return allMemos.pipe(stream =>
    !!name ? stream.pipe(filter(item => isMatch(item.name, name))) : stream
  );
}

export function summariesLogged(name?: string) {
  return allSummaries.pipe(stream =>
    !!name ? stream.pipe(filter(item => isMatch(item.name, name))) : stream
  );
}
