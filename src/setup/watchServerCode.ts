import chokidar from 'chokidar';
import path, { dirname } from 'path';
import { Observable, of, from, defer } from 'rxjs';
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
} from 'rxjs/operators';
import clearModule from 'clear-module';
import { IServiceConfig } from '../shared';

if (process.env.NODE_ENV === 'production') {
  throw new Error('This file should not be imported in production');
}

const resolve = (p: string) => require.resolve(path.join('../', p));

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

const compiledToSource = (file: string) =>
  file
    .replace('\\', '/')
    .replace(`lib/`, `./`)
    .replace('.js', '')
    .replace('.env', `../.env`);

let teardownOldServer = async () => {
  console.log('Dummy teardown was called ... odd');
  return;
};

const moduleInfo = (mod: NodeModule) => ({
  filePath: path.relative('./', mod.filename),
  mod,
});

function allChildModules(startFrom: NodeModule = require.main!) {
  return of(moduleInfo(startFrom)).pipe(
    expand(data =>
      from(data.mod.children).pipe(
        map(moduleInfo),
        filter(pair => !/node_modules/.test(pair.filePath))
      )
    )
  );
}

function findModule(
  relativeToRootPathToDotJs: string,
  startFrom: NodeModule = require.main!
) {
  const compareTo = path.normalize(relativeToRootPathToDotJs);
  return allChildModules(startFrom).pipe(
    //
    find(result => {
      return path.normalize(result.filePath) === compareTo;
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
  setupModuleId: string,
  setup: ServiceSetupFunc
) {
  const initialConfig = requireSetupModule(setupModuleId);
  const setupFilePath = path.relative('./', setupModuleId);

  teardownOldServer = await setup(initialConfig);

  // please note that changes to this pattern will probably need changes to `watchServerCode` function
  // to detect .ts file locations correctly
  const WATCH_PATTERNS = initialConfig.watchPatterns || [
    'lib/**/*.js',
    '.env',
    '.env.local',
  ];

  console.log(`🔍  Watching for file changes in ${WATCH_PATTERNS}`);

  watchMultiple(WATCH_PATTERNS)
    .pipe(
      filter(file => {
        const filePath = compiledToSource(file);

        let resolved: string | null = null;
        let shouldContinue = false;

        try {
          resolved = resolve(filePath);
          shouldContinue = !!resolved;
        } catch (err) {
          console.log(
            `Cannot resolve changes to ${file} (using ${filePath}), ignoring`
          );
        }

        return shouldContinue;
      }),

      mergeMap(file => findModule(file)),

      concatMap(pair => {
        if (pair) {
          return allChildModules(pair.mod).pipe(
            distinct(),
            toArray()
          );
        } else {
          return findModule(setupFilePath).pipe(
            concatMap(setupModule =>
              allChildModules(setupModule!.mod).pipe(
                distinct(),
                toArray()
              )
            )
          );
        }
      }),

      concatMap(mods => from(teardownOldServer()).pipe(mapTo(mods))),

      concatMap(mods => {
        clearModule(setupModuleId);

        for (const mod of mods) {
          if (mod.mod.id === '.') {
            // we do not reload the main module
            continue;
          }
          if (mod.mod.id === setupModuleId) {
            continue;
          }
          if (dirname(mod.mod.id) === __dirname) {
            continue;
          }
          clearModule(mod.mod.id);
        }

        return defer(() =>
          from(
            setup(requireSetupModule(setupModuleId)).then(teardown => {
              teardownOldServer = teardown;
              return Promise.resolve();
            })
          )
        );
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
