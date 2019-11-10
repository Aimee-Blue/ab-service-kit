import { Utils } from '@aimee-blue/ab-shared';
import { AnySocketEpic } from '../kit';
import { logStream } from './logStream';

export interface ILogEpicParams {
  name?: string;
}

export const logEpic = <E extends AnySocketEpic>(
  epic: E,
  log = logStream,
  params: ILogEpicParams
) => {
  const fn = (...args: Parameters<E>) => {
    const [commands, ctx] = args;
    const incomingName = `commands@${params.name || epic.name}`;
    const outgoingName = `results@${params.name || epic.name}`;
    return epic(
      commands.pipe(
        log({
          prefix: incomingName,
        })
      ),
      ctx
    ).pipe(
      log({
        prefix: outgoingName,
      })
    );
  };
  return Utils.setFunctionName(`logEpic.${epic.name}`, fn);
};
