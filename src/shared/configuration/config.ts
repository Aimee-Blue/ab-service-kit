import { Config } from '@aimee-blue/ab-contracts';
import { callFn } from '../api';
import { Observable, from, defer } from 'rxjs';
import { map, flatMap } from 'rxjs/operators';
import { currentSelfSignedToken } from '../auth';

const configurationLoad = async (
  revision?: Config.Revision,
  authToken?: string
) => {
  if (authToken) {
    return callFn<Config.IPartialConfig>('configurationLoadUser')({
      revision,
      authToken,
    });
  } else {
    // self-signed token is not associated with any user:
    const token = await currentSelfSignedToken();
    return callFn<Config.IPartialConfig>('configurationLoad')({
      revision,
      authToken: token,
    });
  }
};

export interface IGetConfigParams {
  revision?: Config.Revision;
  authToken?: string;
}

export const load = async ({
  revision,
  authToken,
}: IGetConfigParams = {}): Promise<Config.IConfig> => {
  try {
    const config = await configurationLoad(revision, authToken);
    return Config.mergeConfigsWithDefault(config);
  } catch (err) {
    console.error('💥  Failed when fetching config', err, revision);
    return Config.defaultConfiguration;
  }
};

export const latest = () => defer(() => from(load()));

export const withLatest = <T>(whatever: Observable<T>) =>
  whatever.pipe(
    flatMap(something =>
      from(load()).pipe(
        map(config => [something, config] as [T, Config.IConfig])
      )
    )
  );
