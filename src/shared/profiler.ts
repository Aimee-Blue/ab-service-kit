import { Logs } from '@aimee-blue/ab-shared';
import { publish } from './pubsub';
import { time } from './time';
import { appVersion, appName } from './app';
import { Observable, merge } from 'rxjs';
import { flatMap, ignoreElements, catchError, filter } from 'rxjs/operators';
import { IAction } from './action';

interface IProfilerLogParams {
  event: string;
  data?: {
    [key: string]: unknown;
  };
}

export const profilerLog = async (params: IProfilerLogParams) => {
  const timestamp = await time();
  const version = await appVersion();
  const name = await appName();
  const data: Logs.ILogParams = {
    event: params.event,
    data: {
      version,
      appName: name,
      ...params.data,
    },
    source: 'server',
    timestamp,
  };
  return publish('profiler', data);
};

function optionalFilter<A extends IAction, AOut extends A = A>(
  predicate?: (action: A) => action is AOut
) {
  return (stream: Observable<A>) => {
    if (predicate) {
      return stream.pipe(filter(predicate));
    } else {
      return stream;
    }
  };
}

export const profileActionStream = <
  A extends IAction,
  AOut extends A = A
>() => (input: Observable<A>, actionsFilter?: (action: A) => action is AOut) =>
  merge(
    input,
    input.pipe(
      optionalFilter(actionsFilter),
      flatMap(({ type, ...rest }) =>
        profilerLog({
          event: type,
          data: rest,
        })
      ),
      ignoreElements(),
      catchError((err, self) => {
        console.error('💥  An error when profiling actions', err);
        return self;
      })
    )
  );
