import { IServiceConfig } from '@shared';
import { ping } from './endpoints/ping';

const config: IServiceConfig = {
  defaultPort: 4000,

  spy: async _spy => {
    return;
  },

  endpoints: async app => {
    ping(app);
  },
};

export default config;
