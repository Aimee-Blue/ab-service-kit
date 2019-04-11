import * as yargs from 'yargs';
import * as Koa from 'koa';
import * as Router from 'koa-router';
import { Observable } from 'rxjs';
import { IncomingMessage } from 'http';
import { IAction } from './action';

export interface ICommandLineArgs {
  http: boolean;
  watch: boolean;
  cert?: string;
  key?: string;
  host?: string;
  port: number;
  envFile?: string;
}

export type EndpointsHandler = (router: Router, app: Koa) => Promise<void>;

export type EndpointHandler<T = {}> = Koa.Middleware<
  T,
  Koa.ParameterizedContext<unknown, Router.IRouterParamContext<unknown, {}>>
>;

export interface IServiceConfig {
  defaultPort: number;

  endpoints?: EndpointsHandler;
  sockets?: () => Promise<ISocketEpicsMap>;
  spy?: (spy: ReturnType<typeof import('rxjs-spy').create>) => Promise<void>;

  argsBuilder?: ArgsBuilder;
  serviceConfigModuleId?: string;
  watchPatterns?: string[];

  shouldUseDefaultEndpoints?: boolean;
}

export interface ISocketEpicsMap {
  [path: string]: AnySocketEpic;
}

export type AnySocketEpic = (
  commands: Observable<unknown>,
  request: IncomingMessage,
  binary: Observable<Buffer>,
  deps?: unknown
) => Observable<IAction | Buffer>;

export type SocketEpic<I extends IAction, D = unknown> = (
  commands: Observable<I>,
  request: IncomingMessage,
  binary: Observable<Buffer>,
  deps?: D
) => Observable<IAction | Buffer>;

type ArgsBuilder = (
  args: yargs.Argv<ICommandLineArgs>
) => yargs.Argv<ICommandLineArgs>;
