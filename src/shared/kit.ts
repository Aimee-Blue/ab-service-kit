import yargs from 'yargs';
import express from 'express';
import WebSocket from 'ws';
import { Observable, ObservedValueOf } from 'rxjs';
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

export interface IBackgroundEpic<
  I extends IAction = IAction,
  O extends IAction = IAction,
  D = {},
  R extends unknown[] = unknown[]
> {
  (
    events: Observable<IAction | I>,
    ctx: IBackgroundEpicContext & D,
    ...args: R
  ): Observable<O>;
  buildDeps?: () => D;
}

export type BackgroundEpic<
  I extends IAction = IAction,
  O extends IAction = IAction,
  D = {}
> = IBackgroundEpic<I, O, D>;

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
  id: string;
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
    commands: Observable<IAction | I>,
    ctx: ISocketEpicContext & D,
    ...args: R
  ): Observable<O>;
}

export const makeSocketEpic = <E extends ISocketEpic>(epic: E): E => epic;

export type AnySocketEpic = SocketEpic;

export type AnyEpic<
  T extends IAction = IAction,
  O extends IAction | Buffer = IAction | Buffer,
  R extends unknown[] = unknown[]
> = (
  commands: Observable<IAction | T>,
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

export type InputOfEpic<E extends AnyEpic> = ObservedValueOf<Parameters<E>[0]>;
export type OutputOfEpic<E extends AnyEpic> = ObservedValueOf<ReturnType<E>>;
export type DependenciesOfBackgroundEpic<E extends BackgroundEpic> = Exclude<
  Parameters<E>[1],
  IBackgroundEpicContext
> extends never
  ? {}
  : Exclude<Parameters<E>[1], IBackgroundEpicContext>;
export type DependenciesOfSocketEpic<E extends SocketEpic> = Exclude<
  Parameters<E>[1],
  ISocketEpicContext
> extends never
  ? {}
  : Exclude<Parameters<E>[1], ISocketEpicContext>;
