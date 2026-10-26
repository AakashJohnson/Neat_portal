


import { extractToken, verifyToken, JwtError } from './jwtService.js';
import { findById } from '../../repositories/userRepository.js';


export class LegacyResponse extends Error {
  constructor(status, body) {
    super('legacy response');
    this.status = status;
    this.body = body;
  }
}

/**
 * @param {import('express').Request} req
 * @param {string[]} verifyKeys payload keys the controller's verifyUser() reads,
 *        in source order (e.g. ['user_id','uuid','email']).
 * @param {{ payloadFirst?: boolean }} [options] payloadFirst: the action calls
 *        `JWTAuth::getToken(); JWTAuth::getPayload(...)` *before* the guard,
 *        so token problems report the getPayload() messages ("A token is required").
 * @returns {Promise<{ user: object, payload: object, token: string }>}
 * @throws {LegacyResponse}
 */
export async function tokenAuthenticate(req, verifyKeys = ['user_id', 'uuid', 'email'], { payloadFirst = false } = {}) {
  const token = extractToken(req);
  let payload;
  try {
    payload = await verifyToken(token, { mode: payloadFirst ? 'getPayload' : 'parseToken' });
  } catch (err) {
    if (err instanceof JwtError) throw new LegacyResponse(200, { message: 'Error', reason: err.message });
    throw err;
  }
  const user = await findById(payload.sub);
  if (!user) throw new LegacyResponse(404, ['message', 'Error']);

  // verifyUser($request->token): JWTAuth::getPayload() + array reads.
  for (const key of verifyKeys) {
    if (!(key in payload)) throw new LegacyResponse(200, { message: 'Error', reason: `Undefined index: ${key}` });
  }
  return { user, payload, token };
}


export function legacyCatch(err) {
  if (err instanceof LegacyResponse) return { status: err.status, body: err.body };
  return null;
}
