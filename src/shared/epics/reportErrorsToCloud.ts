import { Apps } from '@aimee-blue/ab-contracts';
import { from, empty, of } from 'rxjs';
import { mergeMap, catchError, ignoreElements } from 'rxjs/operators';
import { fromEventBus, pushToEventBus } from '../eventBus';
import { ofType } from '../ofType';
import { appName, appVersion } from '../app';
import { appsLogError } from '../apps';

const reportError = async (errorAction: Apps.IErrorAction) => {
  const [source, version] = await Promise.all([appName(), appVersion()]);
  return appsLogError({
    error: errorAction.payload,
    source,
    version,
  });
};

export const registerError = (error: unknown) =>
  of(Apps.error(error)).pipe(pushToEventBus());

export const reportErrorsToCloud = () => {
  return fromEventBus().pipe(
    ofType<Apps.IErrorAction>(Apps.ERROR),
    mergeMap(errorAction => {
      return from(reportError(errorAction)).pipe(
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
