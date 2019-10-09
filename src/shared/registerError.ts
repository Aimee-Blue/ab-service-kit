import { Apps } from '@aimee-blue/ab-contracts';
import { publishToEventBus } from './eventBus';

export const registerError = (error: unknown) =>
  publishToEventBus(Apps.error(error));
