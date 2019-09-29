import { IServiceConfig } from './shared';
import { empty } from 'rxjs';
import { verifyToken, currentSelfSignedToken } from './shared/auth';
import { expressWithAuth } from './shared/auth/expressWithAuth';
import { createTestEpic } from './testEpic';

const config: IServiceConfig = {
  defaultPort: 4010,

  spy: async spy => {
    spy.log(/debug-.*/);
  },

  endpoints: async app => {
    app.get('/test', (req, res) => {
      res.status(200).send('OK - 2');
    });
    app.get('/verify', (_req, res, next) => {
      const fn = async () => {
        const token = await currentSelfSignedToken();
        console.log('token', { token });
        const verified = await verifyToken({
          token,
          allow: ['cluster'],
        });
        return verified;
      };

      fn()
        .then(result => {
          console.log('result', result);
          res.json(result).status(200);
        })
        .catch(err => {
          console.error('Error', err);
          next(err);
        });
    });
    app.get('/test-no-auth', (_req, res) => {
      res.sendStatus(200);
    });
    app.use(expressWithAuth(['project-service-account']));
    app.get('/test-auth', (_req, res) => {
      res.sendStatus(200);
    });
  },

  background: async () => {
    return empty();
  },

  sockets: async () => {
    return {
      '/events': createTestEpic(),
    };
  },
};

export default config;
