import { loadEnv } from './shared/env';
import { Config, defaultBasicLogger } from './shared';

async function run() {
  await loadEnv();

  defaultBasicLogger().log(await Config.load());
}

run().catch(err => {
  defaultBasicLogger().error('', err);
});
