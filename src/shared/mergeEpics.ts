import { merge, defer } from 'rxjs';
import { AnySocketEpic, BackgroundEpic } from './kit';
import { retryWithBackoff } from './retryWithBackoff';
import { Utils } from '@aimee-blue/ab-shared';

export function mergeBackgroundEpics(...epics: BackgroundEpic[]) {
  return (...[events, ctx, ...rest]: Parameters<BackgroundEpic>) => {
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
  };
}

export function mergeEpics(
  name: string,
  ...epics: AnySocketEpic[]
): AnySocketEpic {
  const mergedEpic: AnySocketEpic = Utils.setFunctionName(
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
  );
  return mergedEpic;
}

export const mergeActionEpics = mergeEpics;
