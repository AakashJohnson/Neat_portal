// Security hardening for endpoints that were unauthenticated in Laravel but
// return or change another user's data (SECURITY_REVIEW: SEC-IDOR-*).
import { env } from '../../config/env.js';
import { extractToken, verifyToken, JwtError } from './jwtService.js';
import { LegacyResponse } from './legacyAuth.js';
import { looseEq } from '../../utils/php.js';

const ADMIN_ROLE = 1;

// Read per call (not only at boot) so the test-suite can exercise both modes.
const legacyMode = () => (process.env.LEGACY_PUBLIC_ENDPOINTS ?? String(env.LEGACY_PUBLIC_ENDPOINTS)) === 'true';

/**
 * When hardening is on, require a valid JWT whose application_number equals
 * `applicationNumber` (admins may read any). Throws a 401-style legacy
 * response otherwise. A no-op when LEGACY_PUBLIC_ENDPOINTS=true.
 */
export async function assertOwnApplication(req, applicationNumber) {
  if (legacyMode()) return;
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
  if (legacyMode()) return null;
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
