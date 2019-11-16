import yargs from 'yargs';
import express from 'express';
import WebSocket from 'ws';
import { Observable } from 'rxjs';
import { IncomingMessage } from 'http';
import * as Joi from '@hapi/joi';
import { IAction } from './action';
import { TaggedLogger, BasicLogger } from './logging';

export interface ICommandLineArgs {
  http: boolean;
  watch: boolean;
  cert?: string;
  key?: string;
  host?: string;
  port: number;
  envFile?: string;
}

export type ServiceDeps<D> = {
  logger: BasicLogger;
} & D;

export type EndpointsHandler<D> = (
  app: express.Express,
  deps: ServiceDeps<D>
) => Promise<void>;

export interface IServiceConfig<D = {}> {
  defaultPort: number;

  logger?: () => Promise<BasicLogger>;
  buildDeps?: () => Promise<D>;

  endpoints?: EndpointsHandler<D>;
  sockets?: (deps: ServiceDeps<D>) => Promise<ISocketEpicsMap>;
  background?: (deps: ServiceDeps<D>) => Promise<BackgroundEpic[]>;
  spy?: (
    spy: ReturnType<typeof import('rxjs-spy').create>,
    deps: ServiceDeps<D>
  ) => Promise<void>;

  argsBuilder?: ArgsBuilder;
  serviceConfigModuleId?: string;
  watchPatterns?: string[];

  shouldUseDefaultBackgroundOperations?: boolean;
  shouldUseDefaultEndpoints?: boolean;
  shouldLoadEnvFiles?: boolean;
}

export interface IBackgroundEpicContext {
  logger: TaggedLogger;
}

export interface IBackgroundEpic<D> {
  (events: Observable<IAction>, ctx: IBackgroundEpicContext & D): Observable<
    IAction
  >;
  buildDeps?: () => D;
}

export type BackgroundEpic<D = {}> = IBackgroundEpic<D>;

export interface ISocketEpicsMap {
  [path: string]: AnySocketEpic;
}

export interface ISocketEpicAttributes<O = unknown, D = {}> {
  send?: (socket: WebSocket, data: O) => Promise<void>;
  actionSchemaByType?: (type: string) => Joi.ObjectSchema | null;
  logOnConnection?: (
    socket: WebSocket,
    request: IncomingMessage & { id: string }
  ) => { [key: string]: string | undefined };

  completedSocketWarningTimeout?: number;
  completedSocketWaitTimeout?: number;
  watchModeDetachBehaviour?: 'disconnect' | 'unsubscribe';
  debugStats?: boolean;
  defaultDeps?: () => D;
}

export interface ISocketEpicContext {
  request: IncomingMessage & { id: string };
  binary: Observable<Buffer>;
  subscribe: () => Observable<IAction>;
  publish: () => (events: Observable<IAction>) => Observable<never>;
  logger: TaggedLogger;
  takeUntilClosed: () => <T>(stream: Observable<T>) => Observable<T>;
}

export interface ISocketEpic<I, O = unknown, D = {}>
  extends ISocketEpicAttributes<O, D> {
  (commands: Observable<I>, ctx: ISocketEpicContext & D): Observable<O>;
}

export type AnySocketEpic = ISocketEpic<unknown>;

export type AnyEpic = <T, R, A extends unknown[]>(
  commands: Observable<T>,
  ...args: A
) => Observable<R>;

export type SocketEpic<I, O = unknown, D = {}> = ISocketEpic<I, O, D>;

type ArgsBuilder = (
  args: yargs.Argv<ICommandLineArgs>
) => yargs.Argv<ICommandLineArgs>;
