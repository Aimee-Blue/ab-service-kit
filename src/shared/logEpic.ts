import { tag } from 'rxjs-spy/operators';
import { Utils } from '@aimee-blue/ab-shared';
import { AnySocketEpic } from './kit';

export interface ILogParams {
  name?: string;
}

export const logEpic = <E extends AnySocketEpic>(
  epic: E,
  params: ILogParams
) => {
  const fn = (...args: Parameters<E>) => {
    const [commands, req, binary, ...rest] = args;
    const incomingName = `commands@${params.name || epic.name}`;
    const outgoingName = `results@${params.name || epic.name}`;
    return epic(commands.pipe(tag(incomingName)), req, binary, ...rest).pipe(
      tag(outgoingName)
    );
  };
  return Utils.setFunctionName(`logEpic.${epic.name}`, fn);
};
