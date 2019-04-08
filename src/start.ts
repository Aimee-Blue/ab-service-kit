import 'source-map-support/register';
import * as http from 'http';
import * as https from 'https';
import fs from 'fs-extra';
import yargs from 'yargs';
import { resolve } from 'path';

import { loadEnv } from './setup/env';
import { serviceSetup } from './setup';
import { ICommandLineArgs, IServiceConfig } from './shared';

const buildArgumentsParser = (config: IServiceConfig) =>
  (yargs as yargs.Argv<ICommandLineArgs>)
    .option('http', {
      boolean: true,
      description: 'Disable encryption',
      default: false,
    })
    .option('watch', {
      boolean: true,
      description: 'Watch code for changes',
      default: false,
    })
    .option('port', {
      number: true,
      description: 'port to listen on',
      default: config.defaultPort,
    })
    .option('host', {
      string: true,
      description: 'address to listen on',
    })
    .option('cert', {
      string: true,
      description:
        'Path to an HTTPS certificate (must be full chain certificate)',
    })
    .option('key', {
      string: true,
      description: 'Path to an HTTPS private-key',
    });

export async function start(config: IServiceConfig) {
  const parser = buildArgumentsParser(config);
  const effectiveParser = config.argsBuilder
    ? config.argsBuilder(parser)
    : parser;

  const params = effectiveParser.parse();

  await loadEnv(params.envFile);

  const certPath = params.cert || process.env.HTTPS_CERT_PATH!;
  const keyPath = params.cert || process.env.HTTPS_KEY_PATH!;
  const host = params.host || process.env.SERVER_HOSTNAME;
  const port = params.port;

  if (!params.http) {
    if (!certPath) {
      throw new Error(
        'No certificate path provided. Please generate HTTPS certificate and key, or use --http option'
      );
    }
    if (!keyPath) {
      throw new Error(
        'No private key path provided. Please generate HTTPS certificate and key, or use --http option'
      );
    }

    const certExist = await fs.pathExists(certPath);
    if (!certExist) {
      throw new Error(`Cannot find file at path '${certPath}'`);
    }

    const keyExist = await fs.pathExists(keyPath);
    if (!keyExist) {
      throw new Error(`Cannot find file at path '${keyPath}'`);
    }
  }

  const server = params.http
    ? http.createServer()
    : https.createServer({
        cert: fs.readFileSync(certPath, 'utf8'),
        key: fs.readFileSync(keyPath, 'utf8'),
        passphrase: process.env.HTTPS_PASSPHRASE,
      });

  const handleServerRequestsWithDevTools = async () => {
    if (params.watch) {
      // tslint:disable-next-line: no-unsafe-any
      const serviceSetupInWatchMode = require('./setup/watchServerCode')
        .serviceSetupInWatchMode as typeof import('./setup/watchServerCode')['serviceSetupInWatchMode'];

      const configFile = config.serviceConfigModuleId || './lib/config.js';
      const configFilePath = resolve(configFile);
      const exists = await fs.pathExists(configFilePath);

      if (!exists) {
        throw new Error(
          `Cannot resolve service configuration module (${configFilePath}), setup is required for watch mode to work`
        );
      }

      await serviceSetupInWatchMode(configFilePath, async newConfig => {
        return await serviceSetup(server, newConfig, params);
      });
    } else {
      await serviceSetup(server, config, params);
    }
  };

  await handleServerRequestsWithDevTools();

  server.listen(
    {
      port,
      host,
    },
    () => {
      const mode = params.http
        ? ' (un-encrypted http/ws)'
        : " (https/wss) - Pass '--http' argument to disable encryption";
      console.log(
        `👍  PID ${process.pid}; Currently listening on ${host ||
          ''}${port}${mode}`
      );
    }
  );
}
