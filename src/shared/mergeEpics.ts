import { merge, defer, Observable } from 'rxjs';
import { AnySocketEpic, BackgroundEpic } from './kit';
import { retryWithBackoff } from './retryWithBackoff';
import { Utils } from '@aimee-blue/ab-shared';
import { IAction } from './action';

export function mergeBackgroundEpics(...epics: BackgroundEpic[]) {
  return (events: Observable<IAction>) => {
    return merge(
      ...epics.map(epic =>
        defer(() => epic(events)).pipe(
          retryWithBackoff({
            sourceDescription: `${epic.name} epic`,
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
    (commands, ctx) => {
      return merge(
        ...epics.map(val =>
          defer(() =>
            val(commands, { ...(val.defaultDeps?.() ?? {}), ...ctx })
          ).pipe(
            retryWithBackoff({
              sourceDescription: `${val.name} epic`,
            })
          )
        )
      );
    }
  );
  return mergedEpic;
}

export const mergeActionEpics = mergeEpics;
