import { Apps } from '@aimee-blue/ab-contracts';
import { Api } from '..';

export const appsLogError = async (params: Apps.ILogErrorParams) => {
  const api = Api.apiOf<Apps.IApi>();
  await api.callFn('appsLogError', params);
};
