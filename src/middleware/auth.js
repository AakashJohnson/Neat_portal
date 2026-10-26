import { extractToken, verifyToken, JwtError } from '../services/auth/jwtService.js';
import { findById } from '../repositories/userRepository.js';

/**
 * Resolves the JWT user once per request (like auth('api')->user()).
 * Sets req.auth = { token, payload, user } or null. Never rejects by itself.
 */
export async function resolveAuth(req) {
  if (req.auth !== undefined) return req.auth;
  const token = extractToken(req);
  req.auth = null;
  if (!token) return null;
  try {
    // The JWT guard (auth('api')) also enforces the "prv" subject-model lock.
    const payload = await verifyToken(token, { checkPrv: true });
    const user = await findById(payload.sub);
    if (user) req.auth = { token, payload, user };
  } catch (err) {
    if (!(err instanceof JwtError)) throw err;
    req.authError = err;
  }
  return req.auth;
}


export const requireAuth = async (req, res, next) => {
  try {
    if (await resolveAuth(req)) return next();
    res.status(401).type('text/html; charset=UTF-8').send('Unauthorized.');
  } catch (err) {
    next(err);
  }
};


export const requireGuest = async (req, res, next) => {
  try {
    if (await resolveAuth(req)) return res.redirect(302, `${req.protocol}://${req.get('host')}/`);
    next();
  } catch (err) {
    next(err);
  }
};
