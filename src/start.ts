import { startCore } from './startCore';
import { IServiceConfig, BasicLogger } from './shared';
import { initializeLoggerOrFallback } from './setup/initializeLogger';

export function start(config: IServiceConfig) {
  initializeLoggerOrFallback(config)
    .then(logger => {
      startWithLoggerAndConfig(config, logger);
    })
    .catch(() => {
      // logger initialization cannot throw
      // this handler here is to supress warning
      return;
    });
}

let shutdownRequests = 0;

function startWithLoggerAndConfig(config: IServiceConfig, logger: BasicLogger) {
  function handleError(exc: unknown) {
    logger.error('💥  ', exc);
    process.exit(1);
  }

  function finish() {
    process.exitCode = 0;
  }

  async function run() {
    process.setUncaughtExceptionCaptureCallback(handleError);

    process.on('SIGINT', () => {
      logger.log('\nShutting down due to SIGINT...\n');

      shutdown()
        .then(finish)
        .catch(handleError);

      shutdownRequests += 1;
      if (shutdownRequests > 1) {
        import('wtfnode').then(mod => {
          console.log('== Open Handles ==');
          mod.dump();
          console.log(' ');
        });
      }
      if (shutdownRequests > 5) {
        process.exit(1);
      }
    });

    process.on('SIGTERM', () => {
      logger.log('\nShutting down due to SIGTERM...\n');

      shutdown()
        .then(finish)
        .catch(handleError);
    });

    const teardown = await startCore(config, undefined, logger);

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
