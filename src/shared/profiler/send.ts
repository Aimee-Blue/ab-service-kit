import { Logs } from '@aimee-blue/ab-contracts';
import { time } from '../time';
import * as PubSub from '../pubsub';
import { appVersion, appName } from '../app';
import { Observable, merge, empty, defer } from 'rxjs';
import {
  ignoreElements,
  catchError,
  filter,
  publish,
  mergeMap,
  map,
} from 'rxjs/operators';
import { IAction } from '../action';
import { timesRegistered } from './streams';
import { registerError } from '../registerError';

interface ISendParams {
  event: string;
  traceKey?: string;
  data?: {
    [key: string]: unknown;
  };
}

export const sendOne = async (params: ISendParams) => {
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
    ...(params.traceKey && {
      traceKey: params.traceKey,
    }),
  };
  return PubSub.publish('profiler', data);
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

export interface ISendActionsParams<A extends IAction, AOut extends A = A> {
  event?: string;
  traceKey?: string;
  filter?: (action: A) => action is AOut;
  transform?: (action: A, params?: ISendActionsParams<A, AOut>) => ISendParams;
}

function defaultTransform(
  action: IAction,
  params?: ISendActionsParams<IAction>
): ISendParams {
  const { filter: _, transform: __, ...logParams } = params || {};
  return {
    event: action.type,
    data: (action as unknown) as { [key: string]: unknown },
    ...logParams,
  };
}

export const sendActions = <A extends IAction, AOut extends A = A>(
  params?: ISendActionsParams<A, AOut>,
  deps = {
    sendOne,
  }
) => (input: Observable<A>) =>
  input.pipe(
    publish(shared =>
      merge(
        shared,
        shared.pipe(
          optionalFilter(params && params.filter),
          mergeMap(action =>
            defer(() =>
              deps.sendOne(
                ((params && params.transform) || defaultTransform)(
                  action,
                  params
                )
              )
            ).pipe(
              catchError(err => {
                console.error('💥  An error when profiling actions', err);
                return empty();
              })
            )
          ),
          ignoreElements()
        )
      )
    )
  );

export function sendAllTimings() {
  return timesRegistered().pipe(
    map(timing => ({
      type: `PROFILER/${timing.name.toUpperCase()}`,
      timeTook: timing.time,
      ...timing.details,
    })),
    sendActions(),
    ignoreElements()
  );
}
