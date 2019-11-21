import { Utils } from '@aimee-blue/ab-shared';
import { AnyEpic } from '../kit';
import { conditionalOperator } from '../conditionalOperator';

export interface ILogEpicParams {
  name?: string;
  input?: boolean;
  output?: boolean;
}

export const logEpic = <E extends AnyEpic>(
  epic: E,
  paramsRaw: ILogEpicParams
): E => {
  const fn = (...[commands, ctx, ...rest]: Parameters<E>): ReturnType<E> => {
    const params = {
      logEvents: ctx.logger.logEvents,
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

    const incomingName = `commands@${params.name || epic.name}`;
    const outgoingName = `results@${params.name || epic.name}`;

    return epic(
      commands.pipe(
        maybeLogIncoming({
          prefix: incomingName,
        })
      ),
      ctx,
      ...rest
    ).pipe(
      maybeLogOutgoing({
        prefix: outgoingName,
      })
    ) as ReturnType<E>;
  };

  return (Utils.setFunctionName(`logEpic.${epic.name}`, fn) as unknown) as E;
};
