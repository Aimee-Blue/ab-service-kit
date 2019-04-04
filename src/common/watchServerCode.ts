import chokidar from 'chokidar';
import path from 'path';
import { Observable, of, from, concat } from 'rxjs';
import {
  mergeMap,
  map,
  expand,
  filter,
  find,
  concatMap,
  toArray,
  distinct,
} from 'rxjs/operators';
import * as http from 'http';
import * as https from 'https';

import { serverSetup } from '../serverSetup';
import { teardown } from './initSpy';

if (process.env.NODE_ENV === 'production') {
  throw new Error('This file should not be imported in production');
}

const root = process.cwd();

const SERVER = require.resolve('../server');
const SERVER_SETUP = require.resolve('../serverSetup');
const ENV = require.resolve('../env');
const WATCH = require.resolve('../shared/watchServerCode');

const INIT_SPY = path.relative(root, require.resolve('../shared/initSpy'));
const DOT_ENV = /.env/;

const resolve = (p: string) => require.resolve(path.join('../', p));

// please note that changes to this pattern will probably need changes to `watchServerCode` function
// to detect .ts file locations correctly
const WATCH_PATTERNS = ['lib/**/*.js', '.env', '.env.local'];

const IGNORE_UNLOAD = [SERVER, WATCH];

console.log(`Watching for file changes in ${WATCH_PATTERNS}`);

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

let unsubscribeFromServer = () => {
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

const allChildModulesOfServerSetupModule = () =>
  (findModule(path.relative(root, SERVER_SETUP)) as Observable<
    ReturnType<typeof moduleInfo>
  >).pipe(concatMap(mod => allChildModules(mod.mod)));

export const watchServer = (server: http.Server | https.Server) => {
  const clearModule = require('clear-module');

  unsubscribeFromServer = serverSetup(server);

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

        if (shouldContinue && resolved === SERVER) {
          console.log(
            `${file} file changes cannot be hot-reloaded, please restart server`
          );
          shouldContinue = false;
        }

        if (shouldContinue && resolved === WATCH) {
          console.log(
            `${file} file changes cannot be hot-reloaded, please restart server`
          );
          shouldContinue = false;
        }

        return shouldContinue;
      }),

      mergeMap(file => findModule(file)),

      concatMap(pair => {
        if (pair) {
          return concat(
            allChildModules(pair.mod),
            allChildModulesOfServerSetupModule()
          ).pipe(
            distinct(),
            toArray()
          );
        } else {
          return allChildModulesOfServerSetupModule().pipe(
            distinct(),
            toArray()
          );
        }
      })
    )
    .subscribe(
      mods => {
        unsubscribeFromServer();

        for (const mod of mods) {
          if (IGNORE_UNLOAD.includes(mod.mod.id)) {
            console.log('Skipping', mod.filePath);
            continue;
          }

          const source = compiledToSource(mod.filePath);

          if (DOT_ENV.test(source)) {
            console.log('Unloading', './env');
            clearModule(ENV);
            require(ENV);
          }

          clearModule(mod.mod.id);

          if (INIT_SPY === mod.filePath) {
            console.log('Tearing down RxJs spy');
            teardown();
            const initializeRxJsSpy = require('./initSpy').initializeRxJsSpy;
            initializeRxJsSpy();
          }
        }

        console.log('Unloading', './serverSetup');
        clearModule(SERVER_SETUP);

        const serverSetupNew = require(SERVER_SETUP).serverSetup;
        unsubscribeFromServer = serverSetupNew(server);
      },
      err => console.log('Watching error', err),
      () => console.log('Watching stopped')
    );
};
