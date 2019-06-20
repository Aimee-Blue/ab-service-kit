import yargs from 'yargs';
import express from 'express';
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

export type EndpointsHandler = (app: express.Express) => Promise<void>;

export interface IServiceConfig {
  defaultPort: number;

  endpoints?: EndpointsHandler;
  sockets?: () => Promise<ISocketEpicsMap>;
  background?: () => Promise<Observable<never>>;
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
