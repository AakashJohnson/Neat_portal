import { HttpError } from '../http/respond.js';
import { logger } from '../config/logger.js';
import { JwtError } from '../services/auth/jwtService.js';

/** Unknown route: Laravel NotFoundHttpException with APP_DEBUG=false. */
export const notFound = (_req, res) => res.status(404).json({ message: '' });

/**
 * Central error handler. Known HTTP errors render their Laravel body; anything
 * else is logged (with redaction) and rendered like Laravel's generic 500
 * {"message": "Server Error"} without leaking internals.
 */
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json(err.body);

  // Malformed JSON body (express.json) — Laravel would treat it as empty input,
  // but a 400 with Laravel's message shape is the safest equivalent.
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON body.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: '' });

  // DEV-04: the vendored Laravel Handler was patched to return
  // "<exception message> Line: <php line>" for every uncaught exception, which
  // leaks SQL and source positions. The port keeps the 500 status, keeps the
  // (harmless) jwt-auth messages, and otherwise answers Laravel's stock
  // {"message":"Server Error"}.
  if (err instanceof JwtError) return res.status(500).json({ message: err.message });

  logger.error({ err, reqId: req.id, path: req.path }, 'unhandled error');
  return res.status(500).json({ message: 'Server Error' });
}
