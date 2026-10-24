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
  serializers: {
    // Database errors carry the full SQL with bound values (password hashes,
    // tokens, personal data). Log only the error identifiers.
    err: (err) => {
      if (err && (err.sqlMessage !== undefined || /^ER_/.test(String(err.code ?? '')))) {
        return { type: 'DatabaseError', code: err.code, errno: err.errno, sqlState: err.sqlState };
      }
      return pino.stdSerializers.err(err);
    },
  },
});
