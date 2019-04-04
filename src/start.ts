import { start } from './common/start';

start({
  defaultPort: 4000,
}).catch((exc: unknown) => {
  console.error('💥  ', exc);
  process.exit(1);
});
