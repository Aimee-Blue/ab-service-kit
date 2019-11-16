import { IServiceConfig, defaultBasicLogger } from './shared';
import { verifyToken, currentSelfSignedToken } from './shared/auth';
import { expressWithAuth } from './shared/auth/expressWithAuth';
import { createTestEpic } from './testEpic';

const config: IServiceConfig = {
  defaultPort: 4010,

  spy: async spy => {
    spy.log(/debug-.*/);
  },

  endpoints: async app => {
    const logger = defaultBasicLogger();

    app.get('/verify', (_req, res, next) => {
      const fn = async () => {
        const token = await currentSelfSignedToken();
        logger.log('token', { token });
        const verified = await verifyToken({
          token,
          allow: ['cluster'],
        });
        return verified;
      };

      fn()
        .then(result => {
          logger.log('result', result);
          res.json(result).status(200);
        })
        .catch(err => {
          logger.error('Error', err);
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
    };
  },
};

export default config;
