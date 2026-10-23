import pino from 'pino';
import { env } from './env.js';

// Structured logs. Passwords, tokens and auth headers are never written.
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.query.token',
      'req.body.password',
      'req.body.password_confirmation',
      'req.body.token',
      '*.password',
      '*.token',
    ],
    censor: '[redacted]',
  },
});
