import { Apps } from '@aimee-blue/ab-contracts';
import { Subject } from 'rxjs';
import { Api } from '..';
const errors = new Subject<Apps.ILogErrorParams>();

export const registerError = (error: Apps.ILogErrorParams) =>
  errors.next(error);

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
