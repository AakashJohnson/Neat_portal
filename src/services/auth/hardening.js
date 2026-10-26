import { extractToken, verifyToken, JwtError } from './jwtService.js';
import { LegacyResponse } from './tokenAuth.js';
import { looseEq } from '../../utils/php.js';

const ADMIN_ROLE = 1;


export async function assertOwnApplication(req, applicationNumber) {
  let payload;
  try {
    payload = await verifyToken(extractToken(req), { mode: 'parseToken' });
  } catch (err) {
    if (err instanceof JwtError) throw new LegacyResponse(401, { message: 'Error', reason: err.message });
    throw err;
  }
  if (Number(payload.role_id) === ADMIN_ROLE) return;
  if (!looseEq(payload.application_number, applicationNumber)) {
    throw new LegacyResponse(403, { message: 'Error', reason: 'Forbidden' });
  }
}

/** When hardening is on, require any valid JWT (optionally with one of `roles`). */
export async function assertAuthenticated(req, roles = null) {
  let payload;
  try {
    payload = await verifyToken(extractToken(req), { mode: 'parseToken' });
  } catch (err) {
    if (err instanceof JwtError) throw new LegacyResponse(401, { message: 'Error', reason: err.message });
    throw err;
  }
  if (roles && !roles.map(Number).includes(Number(payload.role_id))) {
    throw new LegacyResponse(403, { message: 'Error', reason: 'Forbidden' });
  }
  return payload;
}
