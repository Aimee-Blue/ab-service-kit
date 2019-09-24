import yargs from 'yargs';
import express from 'express';
import WebSocket from 'ws';
import { Observable } from 'rxjs';
import { IncomingMessage } from 'http';
import * as Joi from '@hapi/joi';

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
  shouldLoadEnvFiles?: boolean;
}

export interface ISocketEpicsMap {
  [path: string]: AnySocketEpic;
}

export interface ISocketEpicAttributes<O = unknown> {
  send?: (socket: WebSocket, data: O) => Promise<void>;
  actionSchemaByType?: (type: string) => Joi.ObjectSchema | null;
  logInfo?: (
    socket: WebSocket,
    request: IncomingMessage & { id: string }
  ) => { [key: string]: string | undefined };

  completedSocketWarningTimeout?: number;
  completedSocketWaitTimeout?: number;
  debugStats?: boolean;
}

export interface ISocketEpic<I, O = unknown, D = unknown>
  extends ISocketEpicAttributes<O> {
  (
    commands: Observable<I>,
    request: IncomingMessage & { id: string },
    binary: Observable<Buffer>,
    deps?: D
  ): Observable<O>;
}

export type AnySocketEpic = ISocketEpic<unknown>;

export type SocketEpic<I, O = unknown, D = unknown> = ISocketEpic<I, D, O>;

type ArgsBuilder = (
  args: yargs.Argv<ICommandLineArgs>
) => yargs.Argv<ICommandLineArgs>;
