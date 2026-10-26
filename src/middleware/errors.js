import { HttpError } from '../http/respond.js';
import { logger } from '../config/logger.js';
import { JwtError } from '../services/auth/jwtService.js';


export const notFound = (_req, res) => res.status(404).json({ message: '' });


export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json(err.body);


  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON body.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: '' });


  if (err instanceof JwtError) return res.status(500).json({ message: err.message });

  logger.error({ err, reqId: req.id, path: req.path }, 'unhandled error');
  return res.status(500).json({ message: 'Server Error' });
}
