import { timer } from 'rxjs';
import { loggingAudit } from './loggingAuditAction';
import { map } from 'rxjs/operators';

export const buildLoggingAuditor = (period: number) => () =>
  timer(0, period).pipe(map(() => loggingAudit()));
