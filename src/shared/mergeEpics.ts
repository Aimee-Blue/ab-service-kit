import { merge, empty, defer } from 'rxjs';
import { AnySocketEpic } from './kit';
import { retryWithBackoff } from './retryWithBackoff';

export function mergeActionEpics(...epics: AnySocketEpic[]): AnySocketEpic {
  const mergedEpic: AnySocketEpic = (commands, request, _binary, deps) => {
    return merge(
      ...epics.map(val =>
        defer(() => val(commands, request, empty(), deps)).pipe(
          retryWithBackoff({
            sourceDescription: `${val.name} epic`,
          })
        )
      )
    );
  };
  return mergedEpic;
}
