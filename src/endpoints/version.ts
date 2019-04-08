import express from 'express';
import { hostname } from 'os';
import { appVersion } from '../shared';

export function version(app: express.Express) {
  app.get('/version', (_req, res, next) => {
    const hostnameStr = hostname();
    appVersion()
      .then(result => {
        res.send(`${result}_${hostnameStr}`).status(200);
      })
      .catch(err => {
        next(err);
      });
  });
}
