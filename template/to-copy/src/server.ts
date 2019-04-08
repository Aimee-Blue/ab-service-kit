import { start } from '@aimee-blue/ab-service-kit';
import config from './config';

start(config).catch((exc: unknown) => {
  console.error('💥  ', exc);
  process.exit(1);
});
