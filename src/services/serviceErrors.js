// Helpers for the `catch (Exception $e) { return ['message'=>'Error','reason'=>$e->getMessage()] }`
// pattern of the NEAT business controllers.
import { validate } from '../validators/validator.js';
import { LegacyResponse } from './auth/tokenAuth.js';
import { logger } from '../config/logger.js';


export const DB_ERROR_REASON = 'Unable to process the request. Please check the submitted data.';

const isDbError = (err) => typeof err?.code === 'string' && (err.code.startsWith('ER_') || err.sqlMessage !== undefined);


export function legacyErrorResponse(err) {
  if (err instanceof LegacyResponse) return { status: err.status, body: err.body };
  if (isDbError(err)) {
    logger.warn({ code: err.code, errno: err.errno }, 'database error in legacy endpoint');
    return { status: 200, body: { message: 'Error', reason: DB_ERROR_REASON } };
  }
  logger.error({ err }, 'error in legacy endpoint');
  return { status: 200, body: { message: 'Error', reason: err?.message ?? 'Error' } };
}

/**
 * `$request->validate([...])` inside the controller's try block: a failure is
 * caught by the generic handler, giving reason "The given data was invalid.".
 */
export async function legacyValidate(data, rules) {
  const errors = await validate(data, rules);
  if (Object.keys(errors).length) {
    throw new LegacyResponse(200, { message: 'Error', reason: 'The given data was invalid.' });
  }
}


export async function legacyRun(fn) {
  try {
    return await fn();
  } catch (err) {
    return legacyErrorResponse(err);
  }
}
