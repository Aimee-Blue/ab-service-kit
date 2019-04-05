import yargs from 'yargs';
import express from 'express';
import { Observable } from 'rxjs';
import { IncomingMessage } from 'http';

export interface ICommandLineArgs {
  http: boolean;
  watch: boolean;
  cert?: string;
  key?: string;
  host?: string;
  port: number;
  envFile?: string;
}

export interface IAction {
  type: string;
}

export interface IServiceConfig {
  defaultPort: number;

  endpoints?: (app: express.Express) => Promise<void>;
  sockets?: () => Promise<ISocketEpicsMap>;
  spy?: (spy: ReturnType<typeof import('rxjs-spy').create>) => Promise<void>;

  argsBuilder?: ArgsBuilder;
  serviceConfigModuleId?: string;
  watchPatterns?: string[];
}

export interface ISocketEpicsMap {
  [path: string]: SocketEpic;
}

export type SocketEpic = <I extends IAction>(
  commands: Observable<I>,
  request: IncomingMessage,
  binary: Observable<Buffer>
) => Observable<IAction | Buffer>;

type ArgsBuilder = (
  args: yargs.Argv<ICommandLineArgs>
) => yargs.Argv<ICommandLineArgs>;
