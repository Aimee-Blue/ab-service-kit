import chokidar from 'chokidar';
import path, { dirname, resolve, join } from 'path';
import { Observable, of, from, defer, concat, timer, never, empty } from 'rxjs';
import {
  mergeMap,
  map,
  expand,
  filter,
  find,
  concatMap,
  toArray,
  mapTo,
  catchError,
  switchMapTo,
} from 'rxjs/operators';
import {
  IServiceConfig,
  isTruthy,
  isUnitTest,
  isIntegrationTest,
  defaultBasicLogger,
} from '../shared';
import { pathExists } from 'fs-extra';
import { TeardownHandler } from '../shared/teardown';
import { clearModule } from '../shared/clearModule';

if (process.env.NODE_ENV === 'production') {
  throw new Error('This file should not be imported in production');
}

const watchMultiple = (patterns: string[]) => {
  if (isUnitTest() || isIntegrationTest()) {
    return never();
  }

  const logger = defaultBasicLogger();

  return new Observable<string>(subscriber => {
    const watcher = chokidar.watch(patterns, {
      ignorePermissionErrors: true,
    });

    const onChange = (file: string) => {
      logger.log('Change detected for', file);
      subscriber.next(file);
    };

    const onError = (err: Error) => {
      subscriber.error(err);
    };

    const onClose = () => {
      subscriber.complete();
    };

    watcher
      .on('change', onChange)
      .on('error', onError)
      .on('close', onClose);

    return () => {
      watcher.close().catch(err => {
        logger.log('Couldnt close file watcher', err);
      });
    };
  });
};

let teardownOldServer: TeardownHandler = async () => {
  const logger = defaultBasicLogger();

  logger.log('Dummy teardown was called ... odd');
  return;
};

const moduleInfo = (mod: NodeModule) => ({
  filePath: path.relative('./', mod.filename),
  mod,
});

function mainModule() {
  if (!require.main) {
    throw new Error('No require.main defined');
  }
  return require.main;
}

function allChildModules(startFrom: NodeModule = mainModule()) {
  return of(moduleInfo(startFrom)).pipe(stream => {
    const set = new Set();

    // sometimes modules circularly reference each other :(
    const uniqueModules = (arr: NodeModule[]) => {
      const items = arr.filter(item => !set.has(item));
      items.forEach(set.add.bind(set));
      return items;
    };

    return stream.pipe(
      expand(data =>
        from(uniqueModules(data.mod.children)).pipe(
          map(moduleInfo),
          filter(pair => !pair.filePath.includes('node_modules'))
        )
      )
    );
  });
}

function findModule(
  fullPathToJs: string,
  startFrom: NodeModule = mainModule()
) {
  const compareTo = resolve(path.normalize(fullPathToJs));

  return concat(
    allChildModules(startFrom),
    from(
      Object.entries(require.cache as { [key: string]: NodeModule | undefined })
        .filter(entry => !entry[0].includes('node_modules'))
        .map(entry => entry[1])
        .filter(isTruthy)
        .map(module => moduleInfo(module))
    )
  ).pipe(
    //
    find(result => {
      const resolvedPath = resolve(path.normalize(result.filePath));
      return resolvedPath === compareTo;
    })
  );
}

function allParentModules(module: NodeModule) {
  return defer(() => {
    return of(module.parent).pipe(
      filter(isTruthy),
      expand(next => (next.parent ? of(next.parent) : empty())),
      map(mod => moduleInfo(mod))
    );
  });
}

type ServiceSetupFunc = (config: IServiceConfig) => Promise<TeardownHandler>;

function requireSetupModule(moduleId: string): IServiceConfig {
  const result = require(moduleId) as
    | IServiceConfig
    | {
        default: IServiceConfig;
      };
  if (typeof result !== 'object') {
    throw new Error('Resolved to a non-object');
  }

  if ('default' in result) {
    return result.default;
  }

  return result;
}

export async function serviceSetupInWatchMode(
  setupFilePath: string,
  setup: ServiceSetupFunc
): Promise<TeardownHandler> {
  const initialConfig = requireSetupModule(setupFilePath);

  const logger = defaultBasicLogger();

  teardownOldServer = await setup(initialConfig);

  // please note that changes to this pattern will probably need changes to `watchServerCode` function
  // to detect .ts file locations correctly
  const WATCH_PATTERNS = initialConfig.watchPatterns || [
    'lib/**/*.js',
    '.env',
    '.env.local',
  ];

  const subscription = defer(() => {
    logger.log(`🔍  Watching for file changes in ${WATCH_PATTERNS.join(', ')}`);
    return watchMultiple(WATCH_PATTERNS);
  })
    .pipe(
      mergeMap(filePath =>
        from(
          pathExists(join(process.cwd(), filePath))
            .catch(() => false)
            .then(exists => ({
              exists,
              filePath,
              resolved: join(process.cwd(), filePath),
            }))
        )
      ),
      filter(pair => {
        if (!pair.exists) {
          logger.log(
            `Cannot resolve changes to ${pair.filePath} (tried ${pair.resolved}), ignoring`
          );
        }

        return pair.exists;
      }),

      mergeMap(fileInfo =>
        findModule(fileInfo.resolved).pipe(
          filter(isTruthy),
          concatMap(mod => concat(of(mod), allParentModules(mod.mod))),
          toArray()
        )
      ),

      filter(mods => mods.length > 0),

      concatMap(mods =>
        from(teardownOldServer('watch-mode')).pipe(mapTo(mods))
      ),

      concatMap(mods => {
        for (const mod of mods) {
          if (mod.mod.id === '.') {
            // we do not reload the main module
            continue;
          }
          if (dirname(mod.mod.id) === __dirname) {
            continue;
          }

          clearModule(mod.mod.id);
        }

        if (!mods.find(item => item.filePath === setupFilePath)) {
          clearModule(setupFilePath);
        }

        return defer(() =>
          from(
            setup(requireSetupModule(setupFilePath)).then(teardown => {
              teardownOldServer = teardown;
              return Promise.resolve();
            })
          )
        );
      }),

      catchError((err, self) => {
        logger.log(
          '💥  Watching error, will wait for 2sec before restart ... ',
          err
        );
        return timer(2000).pipe(switchMapTo(self));
      })
    )
    .subscribe(
      () => {
        return;
      },
      err => logger.log('💥  Watching error', err),
      () => logger.log('Watching stopped')
    );

  return async mode => {
    subscription.unsubscribe();

    await teardownOldServer(mode);
  };
}
