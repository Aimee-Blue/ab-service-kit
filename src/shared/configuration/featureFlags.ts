import * as Config from './config';
import { Observable, from, defer } from 'rxjs';
import { flatMap, map } from 'rxjs/operators';

export function configureFlags<F = {}>(defaultFlags: F) {
  const load = async (params: Config.IGetConfigParams = {}) => {
    const flagsData = (await Config.load(params).then(
      config => config.featureFlags
    )) as F;
    return {
      ...defaultFlags,
      ...flagsData,
    };
  };

  const latest = () => defer(() => from(load()));

  const withLatest = () => <T>(whatever: Observable<T>) =>
    whatever.pipe(
      flatMap(something =>
        from(load()).pipe(map(item => [something, item] as [T, F]))
      )
    );

  return {
    load,
    latest,
    withLatest,
  };
}
