import * as Config from './config';
import { Observable, from, defer } from 'rxjs';
import { flatMap, map } from 'rxjs/operators';

export function configureFlags<F = {}>(defaultFlags: F) {
  const flags = async ({
    forceRefresh,
    revision,
  }: Config.IGetConfigParams = {}) => {
    const flagsData = (await Config.load({ forceRefresh, revision }).then(
      config => config.featureFlags
    )) as F;
    return {
      ...defaultFlags,
      ...flagsData,
    };
  };

  const latestFlags = () => defer(() => from(flags()));

  const withLatestFlags = () => <T>(whatever: Observable<T>) =>
    whatever.pipe(
      flatMap(something =>
        from(flags()).pipe(map(item => [something, item] as [T, F]))
      )
    );

  return {
    flags,
    latestFlags,
    withLatestFlags,
  };
}
