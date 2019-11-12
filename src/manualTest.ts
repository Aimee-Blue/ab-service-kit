import { loadEnv } from './shared/env';
import { Config } from './shared';

async function run() {
  await loadEnv();
  console.log(await Config.load());
}

run().catch(err => {
  console.error('', err);
});
