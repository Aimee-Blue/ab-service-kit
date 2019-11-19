import { merge, defer } from 'rxjs';
import {
  AnySocketEpic,
  BackgroundEpic,
  SocketEpic,
  InputOfEpic,
  OutputOfEpic,
  DependenciesOfBackgroundEpic,
  DependenciesOfSocketEpic,
} from './kit';
import { retryWithBackoff } from './retryWithBackoff';
import { Utils } from '@aimee-blue/ab-shared';

export function mergeBackgroundEpics<E extends BackgroundEpic>(
  ...epics: E[]
): BackgroundEpic<
  InputOfEpic<E>,
  OutputOfEpic<E>,
  DependenciesOfBackgroundEpic<E>
> {
  return ((...[events, ctx, ...rest]: Parameters<BackgroundEpic>) => {
    return merge(
      ...epics.map(epic =>
        defer(() =>
          epic(events, { ...(epic.buildDeps?.() ?? {}), ...ctx }, ...rest)
        ).pipe(
          retryWithBackoff({
            sourceDescription: `${epic.name} epic`,
            logger: ctx.logger,
          })
        )
      )
    );
  }) as BackgroundEpic<
    InputOfEpic<E>,
    OutputOfEpic<E>,
    DependenciesOfBackgroundEpic<E>
  >;
}

export function mergeEpics<E extends AnySocketEpic>(
  name: string,
  ...epics: E[]
): SocketEpic<InputOfEpic<E>, OutputOfEpic<E>, DependenciesOfSocketEpic<E>> {
  const mergedEpic = Utils.setFunctionName(
    name,
    (...[commands, ctx, ...rest]) => {
      return merge(
        ...epics.map(epic =>
          defer(() =>
            epic(commands, { ...(epic.buildDeps?.() ?? {}), ...ctx }, ...rest)
          ).pipe(
            retryWithBackoff({
              sourceDescription: `${epic.name} epic`,
              logger: ctx.logger,
            })
          )
        )
      );
    }
  ) as SocketEpic<InputOfEpic<E>, OutputOfEpic<E>, DependenciesOfSocketEpic<E>>;
  return mergedEpic;
}

export const mergeActionEpics = mergeEpics;
