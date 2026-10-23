// Helpers for the `catch (Exception $e) { return ['message'=>'Error','reason'=>$e->getMessage()] }`
// pattern of the NEAT business controllers.
import { validate } from '../validators/laravelValidator.js';
import { LegacyResponse } from './auth/legacyAuth.js';
import { logger } from '../config/logger.js';

/**
 * DEV-01 (approved deviation, see SECURITY_REVIEW): Laravel returned the raw
 * PDO message, e.g. "SQLSTATE[23000]: ... (SQL: insert into `contact_us` ...)",
 * which leaks table/column names. The port keeps the envelope and status but
 * replaces database error text with a fixed reason.
 */
export const DB_ERROR_REASON = 'Unable to process the request. Please check the submitted data.';

const isDbError = (err) => typeof err?.code === 'string' && (err.code.startsWith('ER_') || err.sqlMessage !== undefined);

/** Maps an exception caught by a legacy controller to its JSON response. */
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

/**
 * Runs a legacy controller body: returns its { status, body } or the response
 * its catch block would have produced.
 */
export async function legacyRun(fn) {
  try {
    return await fn();
  } catch (err) {
    return legacyErrorResponse(err);
  }
}
