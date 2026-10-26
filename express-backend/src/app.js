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
import { loadSettings } from './config/settings.js';
import { projectPath } from './config/paths.js';

/**
 * Builds the Express application. Kept separate from server.js so tests can
 * exercise it with supertest without opening a port.
 */
export function createApp({ rateLimit = 60 } = {}) {
  loadSettings();
  const app = express();

  app.disable('x-powered-by');
  // Behind a reverse proxy in production; correct client IPs for api_tokens/activity.
  // Proxies whose X-Forwarded-For is trusted for the client IP (rate limits,
  // activity log): Next.js BFF on the same host by default; behind a reverse
  // proxy set TRUST_PROXY (Express syntax: hop count, subnet list, …).
  app.set('trust proxy', /^\d+$/.test(env.TRUST_PROXY) ? Number(env.TRUST_PROXY) : env.TRUST_PROXY);

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


  const statics = { index: false, dotfiles: 'deny', fallthrough: true, maxAge: '1h' };
  app.use('/files', express.static(publicPath('files'), statics));
  app.use('/upload', express.static(publicPath('upload'), statics));
  app.use('/assets', express.static(publicPath('assets'), statics));
  app.use('/assets', express.static(projectPath('assets', 'public'), statics));

  app.use('/health', healthRouter);

  app.use('/api', normalizeInput, apiThrottle(rateLimit), rateLimitHeaders, apiRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
