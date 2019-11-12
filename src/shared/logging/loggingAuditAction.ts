import { localNow } from '../time';
import { fromEventBus } from '../eventBus';
import { ofType } from '../ofType';

export const LOGGING_AUDIT = 'LOGGING/AUDIT';

export interface ILoggingAuditAction {
  type: typeof LOGGING_AUDIT;
  timestamp: number;
}

export function loggingAudit() {
  return {
    type: LOGGING_AUDIT,
    timestamp: localNow(),
  };
}

export const onLoggingAudit = () =>
  fromEventBus().pipe(ofType<ILoggingAuditAction>(LOGGING_AUDIT));
