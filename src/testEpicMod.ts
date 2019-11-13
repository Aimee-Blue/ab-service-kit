import { SocketEpic, IAction } from './shared';
import { takeUntil, filter, map } from 'rxjs/operators';
import Joi from '@hapi/joi';

export const echoEpic: SocketEpic<IAction, IAction> = (cmd, { logger }) =>
  cmd.pipe(
    map(action => ({
      ...action,
      type: action.type + '_PROC_AGAIN',
    })),
    takeUntil(cmd.pipe(filter(action => action.type === 'STOP'))),
    logger.logEvents('debug-cmd')
  );
echoEpic.actionSchemaByType = () => Joi.object();
