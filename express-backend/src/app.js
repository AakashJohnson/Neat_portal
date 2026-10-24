import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { apiThrottle, rateLimitHeaders } from './middleware/throttle.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { normalizeInput } from './middleware/normalizeInput.js';
import { publicPath } from './integrations/storage.js';
import { healthRouter } from './routes/health.routes.js';
import { apiRouter } from './routes/index.js';

/**
 * Builds the Express application. Kept separate from server.js so tests can
 * exercise it with supertest without opening a port.
 */
export function createApp({ rateLimit = 60 } = {}) {
  const app = express();

  app.disable('x-powered-by');
  // Behind a reverse proxy in production; correct client IPs for api_tokens/activity.
  app.set('trust proxy', 'loopback');
  // Laravel accepts PHP-style nested query strings (a[b]=c).
  app.set('query parser', 'extended');

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = req.headers['x-request-id'] ?? randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url.startsWith('/health') },
    }),
  );

  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Laravel sent "Access-Control-Allow-Origin: *". The port uses an allow-list
  // (SECURITY_REVIEW: SEC-CORS) and also allows the Authorization header so
  // clients no longer need to put the JWT in the query string.
  const origins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  app.use(
    cors({
      origin: origins.includes('*') ? '*' : origins,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Origin', 'Content-Type', 'X-Auth-Token', 'Authorization', 'X-Request-Id', 'Accept'],
    }),
  );

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Laravel served public/ at the web root; uploaded files keep their URLs.
  // Static only (no script execution), no directory listings, no dotfiles.
  const statics = { index: false, dotfiles: 'deny', fallthrough: true, maxAge: '1h' };
  app.use('/files', express.static(publicPath('files'), statics));
  app.use('/upload', express.static(publicPath('upload'), statics));
  app.use('/assets', express.static(publicPath('assets'), statics));

  app.use('/health', healthRouter);
  // Laravel api group: throttle:60,1 (rateLimit is only raised by the test suite).
  app.use('/api', normalizeInput, apiThrottle(rateLimit), rateLimitHeaders, apiRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
