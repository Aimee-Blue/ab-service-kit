import { Config } from '@aimee-blue/ab-contracts';
import { apiOf } from '../api';
import { Observable, from, defer } from 'rxjs';
import { map, flatMap } from 'rxjs/operators';
import { currentSelfSignedToken } from '../auth';
import { isNumber } from 'util';
import { registerError } from '../registerError';

function last<T>(elements: T[]) {
  if (elements.length === 0) {
    return undefined;
  }

  return elements[elements.length - 1];
}

const configurationLoad = async (params: IGetConfigParams) => {
  const api = apiOf<Config.IApi>();
  if (params.uid) {
    return api.callFn(
      'configurationLoadUser',
      {
        revision: params.revision,
        uid: params.uid,
      },
      {
        authToken: params.authToken,
      }
    );
  } else {
    const token = params.authToken || (await currentSelfSignedToken());

    const lastRevision =
      Array.isArray(params.revision) && last(params.revision.filter(isNumber));

    const revision =
      typeof lastRevision === 'number' ? lastRevision : params.revision;

    return api.callFn(
      'configurationLoad',
      {
        ...(typeof revision === 'number' && {
          revision,
        }),
      },
      {
        authToken: token,
      }
    );
  }
};

export interface IGetConfigParams {
  revision?: Config.Revision;
  authToken?: string;
  uid?: string;
}

export const load = async (
  params: IGetConfigParams = {}
): Promise<Config.IConfig> => {
  if (params.uid && !params.authToken) {
    throw new Error(
      'authToken is required when requesting user specific config'
    );
  }

  try {
    return await configurationLoad(params);
  } catch (err) {
    registerError(err);
    console.error(
      '💥  Failed when fetching config',
      ...[err, params.revision].filter(Boolean)
    );
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
