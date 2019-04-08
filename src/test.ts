import { start } from './start';
import config from './config';

start(config).catch((exc: unknown) => {
  console.error('💥  ', exc);
  process.exit(1);
});
