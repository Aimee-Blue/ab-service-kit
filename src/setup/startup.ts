import * as http from 'http';
import * as https from 'https';
import { Subject } from 'rxjs';
import { IServiceConfig, ICommandLineArgs } from '../shared/kit';

export interface IStartupParams {
  server: http.Server | https.Server;
  config: IServiceConfig;
  args: ICommandLineArgs;
}

export const startup = new Subject<IStartupParams>();
