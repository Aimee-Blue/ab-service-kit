import express from 'express';
import { ping } from './ping';
import { version } from './version';
import { ServiceDeps } from '../shared';

export function defaultEndpoints<D>(
  app: express.Express,
  _deps: ServiceDeps<D>
) {
  ping(app);
  version(app);
}
