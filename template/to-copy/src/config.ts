import { IServiceConfig } from '@shared';

const config: IServiceConfig = {
  defaultPort: 4010,

  spy: async _spy => {
    return;
  },

  endpoints: async _app => {
    return;
  },

  sockets: async () => {
    return {};
  },
};

export default config;
