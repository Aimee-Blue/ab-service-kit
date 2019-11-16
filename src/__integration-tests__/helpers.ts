import * as Joi from '@hapi/joi';
import { IServiceConfig, SocketEpic } from '../shared';
import { startCore } from '../startCore';
import { create } from 'rxjs-spy';

export const startTestService = async (config: IServiceConfig) => {
  return await startCore(config, {
    port: 8080,
    host: 'localhost',
    http: true,
    watch: false,
  });
};

export async function initTestEpic(
  epic: SocketEpic,
  params?: Pick<
    IServiceConfig,
    Exclude<keyof IServiceConfig, 'sockets' | 'defaultPort'>
  >
) {
  const handler = jest.fn(epic);

  Object.assign(
    handler,
    Object.keys(epic).reduce(
      (acc, key: keyof typeof epic) => ({
        ...acc,
        [key]: epic[key],
      }),
      {}
    )
  );

  const actionSchemaByType = jest.fn(() => {
    return Joi.object();
  });

  const config: IServiceConfig = {
    ...params,
    defaultPort: 8080,
    sockets: async () => {
      const events: SocketEpic = handler;
      events.actionSchemaByType = actionSchemaByType;
      return {
        '/events': events,
      };
    },
    shouldLoadEnvFiles: false,
  };

  const spy = create({ defaultPlugins: true });
  spy.log(/debug.*/);

  const teardown = await startTestService(config);

  return {
    handler,
    actionSchemaByType,
    config,
    teardown: () => {
      spy.teardown();
      return teardown();
    },
  };
}
