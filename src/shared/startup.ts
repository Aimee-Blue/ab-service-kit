import * as http from 'http';
import * as https from 'https';
import { IServiceConfig, ICommandLineArgs } from './kit';
import { fromEventBus } from './eventBus';
import { ofType } from './ofType';

export const STARTUP = 'STARTUP';

export interface IStartupAction {
  type: typeof STARTUP;
  server: http.Server | https.Server;
  config: IServiceConfig;
  args: ICommandLineArgs;
}

export function startup(
  server: http.Server | https.Server,
  config: IServiceConfig,
  args: ICommandLineArgs
) {
  return {
    type: STARTUP,
    server,
    config,
    args,
  };
}

export const onStartup = () =>
  fromEventBus().pipe(ofType<IStartupAction>(STARTUP));
