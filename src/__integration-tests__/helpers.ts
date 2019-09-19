import * as Joi from '@hapi/joi';
import { IServiceConfig, SocketEpic } from '../shared';
import { start } from '../start';

export const startTestService = async (config: IServiceConfig) => {
  return await start(config, {
    port: 8080,
    host: 'localhost',
    http: true,
    watch: false,
  });
};

export async function initTestEpic(
  epic: SocketEpic<unknown>,
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
      const events: SocketEpic<unknown> = handler;
      events.actionSchemaByType = actionSchemaByType;
      return {
        '/events': events,
      };
    },
    shouldLoadEnvFiles: false,
  };
  const teardown = await startTestService(config);

  return {
    handler,
    actionSchemaByType,
    config,
    teardown,
  };
}
