import { Apps } from '@aimee-blue/ab-contracts';
import { apiOf } from '../api';

export const appsLogError = async (params: Apps.ILogErrorParams) => {
  const api = apiOf<Apps.IApi>();
  await api.callFn('appsLogError', params);
};
