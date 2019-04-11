import Router from 'koa-router';
import { pingHandler } from './ping';
import { versionHandler } from './version';

export { pingHandler, versionHandler };
export const defaultEndpoints = async (router: Router) => {
  router.get('/ping', pingHandler);
  router.get('/version', versionHandler);
  return;
};
