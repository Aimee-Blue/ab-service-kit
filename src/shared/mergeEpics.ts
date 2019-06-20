import { merge, empty } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AnySocketEpic } from './kit';

export function mergeEpics(...epics: AnySocketEpic[]): AnySocketEpic {
  const mergedEpic: AnySocketEpic = (commands, request, _binary, deps) => {
    return merge(
      ...epics.map(val =>
        val(commands, request, empty(), deps).pipe(
          catchError((err, self) => {
            console.error(
              `💥  CRITICAL! Epic with name ${val.name} has failed`,
              err
            );
            return self;
          })
        )
      )
    );
  };
  return mergedEpic;
}
