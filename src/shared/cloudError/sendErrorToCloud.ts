import { Apps } from '@aimee-blue/ab-contracts';
import { Subject } from 'rxjs';
import { Api } from '..';
import { appName, appVersion } from '../app';

export const errorInfo = Apps.errorInfo;

const errors = new Subject<Apps.ILogErrorParams>();

// What is the best way to start these calls as early as possible so not even the first error has to wait for them?
const defaultSource = appName();
const defaultVersion = appVersion();

type registerErrorParams = Pick<Apps.ILogErrorParams, 'error'> &
  Partial<Apps.ILogErrorParams>;

export const registerError = async (params: registerErrorParams) => {
  const source = params.source ? params.source : await defaultSource;
  const version = params.version ? params.version : await defaultVersion;

  errors.next({ error: params.error, source, version });
};

errors.subscribe(async error => {
  const api = Api.apiOf<Apps.IApi>();
  try {
    await api.callFn('appsLogError', error);
  } catch (e) {
    console.error(
      'Error could not be sent to cloud function.\nError we attempted to send:',
      error
    );
    console.error('Error generated when trying to send original error:', e);
  }
});
