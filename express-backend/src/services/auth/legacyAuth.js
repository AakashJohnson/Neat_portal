// The NEAT business controllers (Admin, Company, Course, Student, Institute,
// Grievance, Payment, Excel, File...) do not use route middleware. Each action
// starts with the same hand-written guard:
//
//   try {
//     if (!$auth = JWTAuth::parseToken()->authenticate() && ($this->verifyUser($request->token))) {
//         return response()->json(['message', 'Error'], 404);
//     }
//     ...
//   } catch (Exception $e) {
//     return response()->json(['message' => 'Error', 'reason' => $e->getMessage()]);
//   }
//
// PHP precedence makes that `!$auth = (authenticate() && verifyUser())`.
// authenticate() throws on a missing/invalid token and returns false when the
// `sub` user no longer exists. verifyUser() compares a Collection with null,
// which is always true, but it reads payload keys first ("Undefined index" if
// a key is missing). This module reproduces that observable behaviour.
import { extractToken, verifyToken, JwtError } from './jwtService.js';
import { findById } from '../../repositories/userRepository.js';

/** Thrown to short-circuit a controller with an exact Laravel response. */
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
export async function legacyAuthenticate(req, verifyKeys = ['user_id', 'uuid', 'email'], { payloadFirst = false } = {}) {
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

/**
 * Converts a thrown LegacyResponse (or a Laravel-style "caught Exception") into
 * the response the original catch block produced.
 */
export function legacyCatch(err) {
  if (err instanceof LegacyResponse) return { status: err.status, body: err.body };
  return null;
}
