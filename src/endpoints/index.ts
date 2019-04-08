import express from 'express';
import { ping } from './ping';
import { version } from './version';

export function defaultEndpoints(app: express.Express) {
  ping(app);
  version(app);
}
