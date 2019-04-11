import { IServiceConfig } from './shared';
import * as Endpoints from './endpoints';

const config: IServiceConfig = {
  defaultPort: 4010,

  spy: async _spy => {
    return;
  },

  endpoints: async router => {
    router.get('/ping', Endpoints.pingHandler);
    router.get('/version', Endpoints.versionHandler);
    return;
  },
};

export default config;
