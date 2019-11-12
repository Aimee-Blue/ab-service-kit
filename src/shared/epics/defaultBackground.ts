import { reportErrorsToCloud } from './reportErrorsToCloud';
import { BackgroundEpic } from '../kit';
import { buildLoggingAuditor } from '../logging/loggingAuditor';

export const defaultBackground: BackgroundEpic[] = [
  reportErrorsToCloud,
  buildLoggingAuditor(5000),
];
