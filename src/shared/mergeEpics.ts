import { merge, empty, defer } from 'rxjs';
import { AnySocketEpic } from './kit';
import { retryWithBackoff } from './retryWithBackoff';
import { Utils } from '@aimee-blue/ab-shared';

export function mergeEpics(
  name: string,
  ...epics: AnySocketEpic[]
): AnySocketEpic {
  const mergedEpic: AnySocketEpic = Utils.setFunctionName(
    name,
    (commands, request, _binary, deps) => {
      return merge(
        ...epics.map(val =>
          defer(() => val(commands, request, empty(), deps)).pipe(
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
