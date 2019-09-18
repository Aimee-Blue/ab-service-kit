import { IServiceConfig, SocketEpic, IAction } from './shared';
import * as Joi from '@hapi/joi';
import { tag } from 'rxjs-spy/operators';
import { takeUntil, filter } from 'rxjs/operators';
import { empty } from 'rxjs';

const config: IServiceConfig = {
  defaultPort: 4010,

  spy: async spy => {
    spy.log(/debug-.*/);
  },

  endpoints: async _app => {
    return;
  },

  background: async () => {
    return empty();
  },

  sockets: async () => {
    const epic: SocketEpic<IAction> = cmd =>
      cmd.pipe(
        takeUntil(cmd.pipe(filter(action => action.type === 'STOP'))),
        tag('debug-cmd')
      );
    epic.actionSchemaByType = () => Joi.object();
    return {
      '/events': epic,
    };
  },
};

export default config;
