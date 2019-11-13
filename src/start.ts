import { startCore } from './startCore';
import { IServiceConfig } from './shared';

export function start(config: IServiceConfig) {
  function finish() {
    process.exitCode = 0;
  }

  function handleError(exc: unknown) {
    console.error('💥  ', exc);
    process.exit(1);
  }

  async function run() {
    process.setUncaughtExceptionCaptureCallback(handleError);

    process.on('SIGINT', () => {
      console.log('\nShutting down due to SIGINT...\n');

      shutdown()
        .then(finish)
        .catch(handleError);
    });

    process.on('SIGTERM', () => {
      console.log('\nShutting down due to SIGTERM...\n');

      shutdown()
        .then(finish)
        .catch(handleError);
    });

    const teardown = await startCore(config);

    let isShuttingDown = false;
    const shutdown = async () => {
      if (isShuttingDown) {
        return;
      }
      isShuttingDown = true;
      await teardown();
    };
  }

  run().catch(handleError);
}
