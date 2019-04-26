import chokidar from 'chokidar';
import path, { dirname, resolve, join } from 'path';
import { Observable, of, from, defer, concat, empty, timer } from 'rxjs';
import {
  mergeMap,
  map,
  expand,
  filter,
  find,
  concatMap,
  toArray,
  distinct,
  mapTo,
  catchError,
  switchMapTo,
  bufferTime,
  bufferWhen,
} from 'rxjs/operators';
import clearModule from 'clear-module';
import { IServiceConfig, isTruthy } from '../shared';
import { pathExists } from 'fs-extra';

if (process.env.NODE_ENV === 'production') {
  throw new Error('This file should not be imported in production');
}

const watchMultiple = (patterns: string[]) => {
  return new Observable<string>(subscriber => {
    const watcher = chokidar.watch(patterns[0], {
      ignorePermissionErrors: true,
    });

    for (const pat of patterns) {
      watcher.add(pat);
    }

    watcher
      .on('change', (file: string) => {
        console.log('Change detected for', file);
        subscriber.next(file);
      })
      .on('error', err => {
        subscriber.error(err);
      })
      .on('close', () => {
        subscriber.complete();
      });

    return () => {
      watcher.close();
    };
  });
};

let teardownOldServer = async () => {
  console.log('Dummy teardown was called ... odd');
  return;
};

const moduleInfo = (mod: NodeModule) => ({
  filePath: path.relative('./', mod.filename),
  mod,
});

function allChildModules(startFrom: NodeModule = require.main!) {
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
          filter(pair => !/node_modules/.test(pair.filePath))
        )
      )
    );
  });
}

function findModule(
  fullPathToJs: string,
  startFrom: NodeModule = require.main!
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

type ServiceSetupFunc = (
  config: IServiceConfig
) => Promise<() => Promise<void>>;

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
    return result.default as IServiceConfig;
  }

  return result as IServiceConfig;
}

export async function serviceSetupInWatchMode(
  setupFilePath: string,
  setup: ServiceSetupFunc
) {
  const initialConfig = requireSetupModule(setupFilePath);

  teardownOldServer = await setup(initialConfig);

  // please note that changes to this pattern will probably need changes to `watchServerCode` function
  // to detect .ts file locations correctly
  const WATCH_PATTERNS = initialConfig.watchPatterns || [
    'lib/**/*.js',
    '.env',
    '.env.local',
  ];

  defer(() => {
    console.log(`🔍  Watching for file changes in ${WATCH_PATTERNS}`);
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
          console.log(
            `Cannot resolve changes to ${pair.filePath} (tried ${
              pair.resolved
            }), ignoring`
          );
        }

        return pair.exists;
      }),

      mergeMap(fileInfo => findModule(fileInfo.resolved)),

      concatMap(pair =>
        concat(
          findModule(setupFilePath).pipe(
            filter(isTruthy),
            concatMap(setupModule => allChildModules(setupModule.mod))
          ),
          pair ? allChildModules(pair.mod) : empty()
        ).pipe(
          distinct(mod => mod.filePath),
          toArray()
        )
      ),

      concatMap(mods => from(teardownOldServer()).pipe(mapTo(mods))),

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
        console.log(
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
      err => console.log('💥  Watching error', err),
      () => console.log('Watching stopped')
    );
}
