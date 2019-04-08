import { start } from '@aimee-blue/ab-service-kit';
import service from './service';

start(service).catch((exc: unknown) => {
  console.error('💥  ', exc);
  process.exit(1);
});
