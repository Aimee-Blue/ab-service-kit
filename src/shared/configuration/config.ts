import { Config } from '@aimee-blue/ab-shared';
import { callFn } from '../api';
import { Observable, from, timer, defer } from 'rxjs';
import { map, flatMap, ignoreElements, switchMapTo } from 'rxjs/operators';
import { isTest } from '../isTest';
import { onStartup } from '../startup';

const configurationLoad = (revision?: number) =>
  callFn<Config.IConfig>('configurationLoad')({ revision });

const configurations = new Map<number | 'no-revision', Config.IConfig>();

export interface IGetConfigParams {
  forceRefresh?: boolean;
  revision?: number;
}

export const load = async ({
  forceRefresh,
  revision,
}: IGetConfigParams = {}): Promise<Config.IConfig> => {
  const rev = typeof revision === 'number' ? revision : 'no-revision';

  if (!forceRefresh && configurations.has(rev)) {
    return configurations.get(rev) as Config.IConfig;
  } else {
    try {
      const config = await configurationLoad(revision);
      configurations.set(rev, config);
      if (rev === 'no-revision') {
        configurations.set(config.revision, config);
      }

      return config;
    } catch (err) {
      console.error(`💥  Failed when fetching config: ${rev}.`, err);
      return Config.defaultConfiguration;
    }
  }
};

export const latest = () => defer(() => from(load()));

export const withLatest = <T>(whatever: Observable<T>) =>
  whatever.pipe(
    // tslint:disable-next-line:rxjs-no-unsafe-scope
    flatMap(something =>
      from(load()).pipe(
        map(config => [something, config] as [T, Config.IConfig])
      )
    )
  );

if (!isTest()) {
  const CONFIG_REFRESH_PERIOD = 60000;

  onStartup()
    .pipe(
      switchMapTo(
        timer(0, CONFIG_REFRESH_PERIOD).pipe(
          flatMap(() => load()),
          ignoreElements()
        )
      )
    )
    .subscribe();
}
