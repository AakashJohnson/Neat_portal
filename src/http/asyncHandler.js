/** Wraps an async controller so rejected promises reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Sends a service result of the form { status, body }. */
export const send = (res, { status = 200, body }) => res.status(status).json(body);
