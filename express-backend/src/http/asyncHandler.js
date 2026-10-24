/** Wraps an async controller so rejected promises reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Sends a service result:
 *   { status, body }  → JSON
 *   { empty: true }   → Laravel's response for an action that returned nothing
 *                       (status 200, empty text/html body)
 */
export function send(res, { status = 200, body, empty = false }) {
  if (empty) return res.status(status).type('text/html; charset=UTF-8').send('');
  return res.status(status).json(body);
}
