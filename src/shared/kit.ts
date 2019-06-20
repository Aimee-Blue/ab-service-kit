import yargs from 'yargs';
import express from 'express';
import WebSocket from 'ws';
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

export interface ISocketEpic<I, O = unknown, D = unknown> {
  (
    commands: Observable<I>,
    request: IncomingMessage,
    binary: Observable<Buffer>,
    deps?: D
  ): Observable<O>;

  send?: (socket: WebSocket, data: O) => Promise<void>;
}

export type AnySocketEpic = ISocketEpic<unknown>;

export type SocketEpic<I, O = unknown, D = unknown> = ISocketEpic<I, D, O>;

type ArgsBuilder = (
  args: yargs.Argv<ICommandLineArgs>
) => yargs.Argv<ICommandLineArgs>;
