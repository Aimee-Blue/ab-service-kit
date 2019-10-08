import { of } from 'rxjs';
import { Apps } from '@aimee-blue/ab-contracts';
import { pushToEventBus } from './eventBus';

export const registerError = (error: unknown) =>
  of(Apps.error(error)).pipe(pushToEventBus());
