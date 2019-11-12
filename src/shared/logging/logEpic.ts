import { Utils } from '@aimee-blue/ab-shared';
import { AnyEpic } from '../kit';
import { logEvents } from './logEvents';
import { conditionalOperator } from '../conditionalOperator';

export interface ILogEpicParams {
  name?: string;
  input?: boolean;
  output?: boolean;
  logEvents?: typeof logEvents;
}

export const logEpic = <E extends AnyEpic>(
  epic: E,
  paramsRaw: ILogEpicParams
) => {
  const params = {
    logEvents,
    ...paramsRaw,
  };

  const maybeLogIncoming = conditionalOperator(
    params.input ?? true,
    params.logEvents
  );

  const maybeLogOutgoing = conditionalOperator(
    params.output ?? true,
    params.logEvents
  );

  const fn = (...args: Parameters<E>) => {
    const [commands, ...rest] = args;

    const incomingName = `commands@${params.name || epic.name}`;
    const outgoingName = `results@${params.name || epic.name}`;

    return epic(
      commands.pipe(
        maybeLogIncoming({
          prefix: incomingName,
        })
      ),
      ...rest
    ).pipe(
      maybeLogOutgoing({
        prefix: outgoingName,
      })
    );
  };

  return Utils.setFunctionName(`logEpic.${epic.name}`, fn);
};
