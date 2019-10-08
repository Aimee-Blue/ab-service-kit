import { reportErrorsToCloud } from './reportErrorsToCloud';
import { merge } from 'rxjs';

export const defaultBackground = merge(reportErrorsToCloud());
