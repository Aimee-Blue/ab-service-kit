import { Apps } from '@aimee-blue/ab-contracts';
import { from, empty } from 'rxjs';
import { mergeMap, catchError, ignoreElements } from 'rxjs/operators';
import { ofType } from '../ofType';
import { appName, appVersion } from '../app';
import { appsLogError } from '../apps';
import { isDevBuild } from '../isTest';
import { BackgroundEpic } from '../kit';

const reportError = async (errorAction: Apps.IErrorAction) => {
  const [source, version] = await Promise.all([appName(), appVersion()]);
  return appsLogError({
    error: errorAction.payload,
    source,
    version,
  });
};

export const reportErrorsToCloud: BackgroundEpic = events => {
  if (isDevBuild()) {
    return empty();
  }

  return events.pipe(
    ofType<Apps.IErrorAction>(Apps.ERROR),
    mergeMap(errorAction =>
      from(reportError(errorAction)).pipe(
        catchError(err => {
          console.error('💥  Couldnt send error to Cloud', err);
          return empty();
        })
      )
    ),
    ignoreElements()
  );
};
