import { Apps } from '@aimee-blue/ab-contracts';
import { from, empty } from 'rxjs';
import { mergeMap, catchError, ignoreElements } from 'rxjs/operators';
import { fromEventBus } from '../eventBus';
import { ofType, appName, appVersion } from '../..';
import { appsLogError } from '../apps';

export const sendAppErrorsToCloud = () => {
  return fromEventBus().pipe(
    ofType<Apps.IErrorAction>(Apps.ERROR),
    mergeMap(errorAction =>
      from(async () => {
        // TODO: use new callOnce util.
        const [source, version] = await Promise.all([appName(), appVersion()]);
        return appsLogError({
          error: errorAction.payload,
          source,
          version,
        });
      }).pipe(
        catchError(err => {
          // tslint:disable-next-line:no-console
          console.error('💥  Couldnt send error to Cloud', err);
          return empty();
        })
      )
    ),
    ignoreElements()
  );
};
