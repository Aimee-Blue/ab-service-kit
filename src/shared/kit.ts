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

export interface IBackgroundEpic<D = {}, R extends unknown[] = unknown[]> {
  (
    events: Observable<IAction>,
    ctx: IBackgroundEpicContext & D,
    ...args: R
  ): Observable<IAction>;
  buildDeps?: () => D;
}

export type BackgroundEpic<D = {}> = IBackgroundEpic<D>;

export interface ISocketEpicsMap {
  [path: string]: AnySocketEpic;
}

export interface ISocketEpicAttributes<
  O extends IAction | Buffer = IAction | Buffer,
  D = {}
> {
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
  buildDeps?: () => D;
}

export interface ISocketEpicContext {
  request: IncomingMessage & { id: string };
  binary: Observable<Buffer>;
  subscribe: () => Observable<IAction>;
  publish: () => (events: Observable<IAction>) => Observable<never>;
  logger: TaggedLogger;
  takeUntilClosed: () => <T>(stream: Observable<T>) => Observable<T>;
}

export interface ISocketEpic<
  I extends IAction = IAction,
  O extends IAction | Buffer = IAction | Buffer,
  D = {},
  R extends unknown[] = unknown[]
> extends ISocketEpicAttributes<O, D> {
  (
    commands: Observable<I>,
    ctx: ISocketEpicContext & D,
    ...args: R
  ): Observable<O>;
}

export type AnySocketEpic = SocketEpic;

export type AnyEpic = <
  T extends IAction,
  O extends IAction,
  R extends unknown[]
>(
  commands: Observable<T>,
  ctx: IBackgroundEpicContext | ISocketEpicContext,
  ...args: R
) => Observable<O>;

export type SocketEpic<
  I extends IAction = IAction,
  O extends IAction | Buffer = IAction | Buffer,
  D = {},
  R extends unknown[] = unknown[]
> = ISocketEpic<I, O, D, R>;

type ArgsBuilder = (
  args: yargs.Argv<ICommandLineArgs>
) => yargs.Argv<ICommandLineArgs>;
