import { rateLimit } from 'express-rate-limit';
import { clientIp } from '../utils/request.js';

/**
 * Laravel `throttle:60,1` from the api middleware group: 60 requests per
 * minute per client, X-RateLimit-Limit / X-RateLimit-Remaining on every
 * response, 429 {"message":"Too Many Attempts."} with Retry-After when exceeded.
 */
export const apiThrottle = (limit = 60) =>
  rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: false,
    legacyHeaders: false,
    keyGenerator: (req) => clientIp(req),
    handler: (req, res, _next, options) => {
      const resetSeconds = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));
      res.set({
        'X-RateLimit-Limit': String(options.limit),
        'X-RateLimit-Remaining': '0',
        'Retry-After': String(resetSeconds),
        'X-RateLimit-Reset': String(Math.ceil(req.rateLimit.resetTime / 1000)),
      });
      res.status(429).json({ message: 'Too Many Attempts.' });
    },
    requestPropertyName: 'rateLimit',
  });

/** Adds Laravel's rate-limit headers to successful responses too. */
export const rateLimitHeaders = (req, res, next) => {
  if (req.rateLimit) {
    res.set('X-RateLimit-Limit', String(req.rateLimit.limit));
    res.set('X-RateLimit-Remaining', String(Math.max(0, req.rateLimit.remaining)));
  }
  next();
};
