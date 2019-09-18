import * as express from 'express';
import { verifyToken } from './verifyToken';
import { Auth } from '@aimee-blue/ab-contracts';

async function verifyTokenForRequest(
  allow: Auth.Role[],
  req?: express.Request
) {
  // For safety purpose check anyway
  // tslint:disable-next-line
  if (!req || !req.headers) {
    return null;
  }

  const authorization = req.headers.authorization;
  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer (.*)$/);
  if (!match) {
    return null;
  }

  const token = match[1];

  return await verifyToken({
    token,
    allow,
  });
}

export const expressWithAuth = (allow: Auth.Role[]): express.Handler => (
  req,
  res,
  next
) => {
  verifyTokenForRequest(allow, req)
    .then(result => {
      if (!result) {
        res.set('Connection', 'close');
        res.status(401).json({
          error: {
            status: 'unauthorized',
            message: 'Unauthorized',
          },
        });
        res.end();
        return;
      }

      if (result.status !== 200) {
        res.set('Connection', 'close');
        res.status(404).json({
          error: {
            status: 'not-found',
            message: 'Not found',
          },
        });
        res.end();
        return;
      }

      next(undefined);
    })
    .catch(err => next(err));
};
