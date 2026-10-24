// Server-side session helpers (route handlers, server components, proxy.js).
// The API JWT lives only in an httpOnly cookie; the browser receives its
// non-secret claims through GET /api/session.
import 'server-only';
import { jwtVerify, decodeJwt } from 'jose';
import { cookies } from 'next/headers';
import { TOKEN_COOKIE, TOKEN_TTL_MINUTES } from '@/lib/config';

const secret = () => (process.env.NEAT_JWT_SECRET ? new TextEncoder().encode(process.env.NEAT_JWT_SECRET) : null);

/**
 * Verifies a token's HS256 signature and expiry (the API additionally checks
 * the jti row). Without NEAT_JWT_SECRET only expiry is checked and the API
 * remains the authority.
 * @returns {Promise<object|null>} claims
 */
export async function readClaims(token) {
  if (!token) return null;
  try {
    const key = secret();
    if (key) return (await jwtVerify(token, key, { algorithms: ['HS256'] })).payload;
    const claims = decodeJwt(token);
    return claims.exp && claims.exp * 1000 > Date.now() ? claims : null;
  } catch {
    return null;
  }
}

export async function getToken() {
  return (await cookies()).get(TOKEN_COOKIE)?.value ?? null;
}

/** Claims exposed to the browser (never the raw token, never jti/prv). */
export function publicClaims(claims) {
  if (!claims) return null;
  const { jti: _jti, prv: _prv, ...rest } = claims;
  return rest;
}

/**
 * Whether the Angular pages' inline decode succeeds for this token:
 *   JSON.parse(atob(token.split('.')[1].replace('-', '+').replace('_', '/')))
 * (only the first '-' and '_' are replaced; any other makes atob throw and the
 * rest of that page's ngOnInit does not run). Exposed as a boolean only.
 */
export function legacyDecodable(token) {
  try {
    JSON.parse(atob(token.split('.')[1].replace('-', '+').replace('_', '/')));
    return true;
  } catch {
    return false;
  }
}

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: TOKEN_TTL_MINUTES * 60,
});
