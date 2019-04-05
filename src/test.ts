import { start } from './start';
import service from './service';

start(service).catch((exc: unknown) => {
  console.error('💥  ', exc);
  process.exit(1);
});
