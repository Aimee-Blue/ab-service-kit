import { Apps } from '@aimee-blue/ab-contracts';
import { from, empty } from 'rxjs';
import { mergeMap, catchError, ignoreElements } from 'rxjs/operators';
import { fromEventBus } from '../eventBus';
import { ofType } from '../ofType';
import { appName, appVersion } from '../app';
import { appsLogError } from '../apps';

const sendError = async (errorAction: Apps.IErrorAction) => {
  const [source, version] = await Promise.all([appName(), appVersion()]);
  return appsLogError({
    error: errorAction.payload,
    source,
    version,
  });
};

export const sendAppErrorsToCloud = () => {
  return fromEventBus().pipe(
    ofType<Apps.IErrorAction>(Apps.ERROR),
    mergeMap(errorAction => {
      return from(sendError(errorAction)).pipe(
        catchError(err => {
          // tslint:disable-next-line:no-console
          console.error('💥  Couldnt send error to Cloud', err);
          return empty();
        })
      );
    }),
    ignoreElements()
  );
};
