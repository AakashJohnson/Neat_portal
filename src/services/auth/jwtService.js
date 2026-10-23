// Port of tymon/jwt-auth 1.0.0-rc.5 as customised by app/Services/Auth/Api/*:
// HS256 tokens signed with JWT_SECRET, a `jti` that must match a live
// api_tokens row, the `prv` subject-model lock and the custom claims from
// Neat\User::getJWTCustomClaims().
import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import * as apiTokens from '../../repositories/apiTokenRepository.js';
import { unixNow } from '../../utils/time.js';

// sha1(get_class($user)) with the Laravel model class "Neat\User".
export const SUBJECT_PRV = createHash('sha1').update('Neat\\User').digest('hex');

export class JwtError extends Error {
  /** @param {'absent'|'expired'|'invalid'} kind */
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

/** Claims exactly as Neat\User::getJWTCustomClaims() builds them (key order preserved). */
function customClaims(user, jti) {
  const claims = {
    jti,
    user_id: user.id,
    email: user.email,
    email_verified_at: user.email_verified_at,
    uuid: user.unique_uuid,
    role_id: user.role_id,
    application_number: user.application_number,
    username: user.username,
  };
  // Institutes (role 5) also carry permanent_institute_id, before phone.
  if (String(user.role_id) === '5') claims.permanent_institute_id = user.permanent_institute_id;
  claims.phone = user.phone;
  return claims;
}

/**
 * JWTAuth::fromUser() / attempt(): issues a token and its api_tokens row.
 * @param {object} user users row
 * @param {{ issuer: string, ip?: string, userAgent?: string }} ctx
 *        issuer = $request->url() of the issuing request (e.g. http://host/api/login)
 */
export async function issueToken(user, { issuer, ip, userAgent }) {
  const row = await apiTokens.createForUser(user.id, { ip, userAgent, ttlMinutes: env.JWT_TTL });
  const iat = unixNow();
  const { jti, ...custom } = customClaims(user, row.id);
  const payload = {
    iss: issuer,
    iat,
    exp: iat + env.JWT_TTL * 60,
    nbf: iat,
    jti,
    sub: user.id,
    prv: SUBJECT_PRV,
    ...custom,
  };
  // Header must be {"typ":"JWT","alg":"HS256"} like lcobucci/namshi output.
  // payload.iat is supplied explicitly, so jsonwebtoken keeps it (and its position).
  return jwt.sign(payload, env.JWT_SECRET, { algorithm: 'HS256', header: { typ: 'JWT', alg: 'HS256' } });
}

/**
 * Parser chain used by tymon's Laravel provider: Authorization header,
 * ?token= query string, "token" input field, then the "token" cookie.
 */
export function extractToken(req) {
  const header = req.get('authorization') ?? '';
  const bearer = header.match(/^\s*Bearer\s+(\S+)/i);
  if (bearer) return bearer[1];
  if (typeof req.query?.token === 'string' && req.query.token) return req.query.token;
  if (typeof req.body?.token === 'string' && req.body.token) return req.body.token;
  const cookie = (req.get('cookie') ?? '').match(/(?:^|;\s*)token=([^;]+)/);
  if (cookie) return decodeURIComponent(cookie[1]);
  return null;
}

// jti is required too, but a missing jti surfaces as "Invalid jti claim."
// (ExtendsJwtValidation runs its lookup with a null jti).
const REQUIRED_CLAIMS = ['iss', 'iat', 'exp', 'nbf', 'sub'];

function decodeSegment(segment) {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

/**
 * JWTAuth::getPayload() with the jti check from ExtendsJwtValidation.
 * Error messages are the exact tymon/jwt-auth rc.5 + namshi/jose messages,
 * because some endpoints echo them (e.g. verifyUserLoggedIn "reason").
 *
 * @param {string|null} token
 * @param {{ checkPrv?: boolean, mode?: 'getPayload'|'parseToken' }} [options]
 *   checkPrv: only the JWT *guard* (auth middleware) checks the "prv" subject
 *   lock; JWTAuth::getPayload() does not.
 *   mode: JWTAuth::getToken()+getPayload() swallows parse errors and reports
 *   "A token is required"; JWTAuth::parseToken() reports the parse error itself.
 * @returns {Promise<object>} verified payload
 * @throws {JwtError}
 */
export async function verifyToken(token, { checkPrv = false, mode = 'getPayload' } = {}) {
  if (mode === 'parseToken') {
    if (!token) throw new JwtError('absent', 'The token could not be parsed from the request');
    if (token.split('.').length !== 3) throw new JwtError('invalid', 'Wrong number of segments');
  }
  if (!token || token.split('.').length !== 3) throw new JwtError('absent', 'A token is required');

  const [headerPart, payloadPart] = token.split('.');
  try {
    decodeSegment(headerPart);
    decodeSegment(payloadPart);
  } catch {
    throw new JwtError('invalid', `Could not decode token: The token "${token}" is an invalid JWS`);
  }

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new JwtError('expired', 'Token has expired');
    if (err.name === 'NotBeforeError') throw new JwtError('invalid', 'Not Before (nbf) timestamp cannot be in the future');
    throw new JwtError('invalid', 'Token Signature could not be verified.');
  }
  if (payload.iat > unixNow()) throw new JwtError('invalid', 'Issued At (iat) timestamp cannot be in the future');
  for (const claim of REQUIRED_CLAIMS) {
    if (payload[claim] === undefined) throw new JwtError('invalid', 'JWT payload does not contain the required claims');
  }
  if (!(await apiTokens.isValid(payload.jti ?? null, payload.sub))) throw new JwtError('invalid', 'Invalid jti claim.');
  if (checkPrv && payload.prv !== undefined && payload.prv !== SUBJECT_PRV) {
    throw new JwtError('invalid', 'Subject model mismatch');
  }
  return payload;
}

/** JWTAuth::invalidate(): deletes the api_tokens row. */
export const invalidateToken = async (token) => {
  const decoded = jwt.decode(token);
  if (decoded?.jti) await apiTokens.deleteById(decoded.jti);
};
