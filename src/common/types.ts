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

export interface IServiceConfig {
  defaultPort: number;

  endpoints?: (app: express.Express) => Promise<void>;
  sockets?: () => Promise<ISocketsMap>;

  argsBuilder?: ArgsBuilder;
}

export interface ISocketsMap {
  [path: string]: SocketPipeline;
}

type SocketPipeline = <I extends { type: string }, O extends { type: string }>(
  request: IncomingMessage,
  commands: Observable<I>,
  binary: Observable<Buffer>
) => Observable<O | Buffer>;

type ArgsBuilder = (
  args: yargs.Argv<ICommandLineArgs>
) => yargs.Argv<ICommandLineArgs>;
