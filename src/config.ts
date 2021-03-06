import { IServiceConfig } from './shared';
import { verifyToken, currentSelfSignedToken } from './shared/auth';
import { expressWithAuth } from './shared/auth/expressWithAuth';
import { createTestEpic } from './testEpic';

const config: IServiceConfig = {
  defaultPort: 4010,

  spy: async spy => {
    spy.log(/debug-.*/);
  },

  endpoints: async (app, deps) => {
    app.get('/verify', (_req, res, next) => {
      const fn = async () => {
        const token = await currentSelfSignedToken();
        deps.logger.log('token', { token });
        const verified = await verifyToken({
          token,
          allow: ['cluster'],
        });
        return verified;
      };

      fn()
        .then(result => {
          deps.logger.log('result', result);
          res.json(result).status(200);
        })
        .catch(err => {
          deps.logger.error('Error', err);
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

  sockets: async () => {
    return {
      '/events': createTestEpic(),
      '/binary-performance-test': createTestEpic(),
    };
  },
};

export default config;
