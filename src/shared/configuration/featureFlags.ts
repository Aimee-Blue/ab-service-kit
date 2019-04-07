import { IGetConfigParams, loadConfig } from './config';
import { Observable, from, defer } from 'rxjs';
import { flatMap, map } from 'rxjs/operators';

export function configureLoadFlags<F = {}>(defaultFlags: F) {
  const loadFlags = async ({
    forceRefresh,
    revision,
  }: IGetConfigParams = {}) => {
    const flagsData = (await loadConfig({ forceRefresh, revision }).then(
      config => config.featureFlags
    )) as F;
    return {
      ...defaultFlags,
      ...flagsData,
    };
  };

  const latestFlags = () =>
    defer(() => from(loadFlags({ forceRefresh: false })));

  const withLatestFlags = () => <T>(whatever: Observable<T>) =>
    whatever.pipe(
      flatMap(something =>
        from(loadFlags({ forceRefresh: false })).pipe(
          map(flags => [something, flags] as [T, F])
        )
      )
    );

  return {
    loadFlags,
    latestFlags,
    withLatestFlags,
  };
}
