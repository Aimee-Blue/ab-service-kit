import { sendAppErrorsToCloud } from './cloudError';
import { merge } from 'rxjs';

export const defaultBackground = merge(sendAppErrorsToCloud());
