import { hostname } from 'os';
import { appVersion } from '../shared';

import { EndpointHandler } from '../shared/kit';

export const versionHandler: EndpointHandler = async (ctx, next) => {
  const hostnameStr = hostname();
  const version = await appVersion();

  ctx.body = `${version}_${hostnameStr}`;
  ctx.status = 200;

  await next();
};
