// Response helpers equivalent to Laravel's Api\ApiController.

/** respondWithArray(): JSON body with the given status. */
export const respondWithArray = (res, body, status = 200) => res.status(status).json(body);

/** respondWithSuccess(): {"success": true} */
export const respondWithSuccess = (res, status = 200) => res.status(status).json({ success: true });

const errorWith = (status, fallback) => (res, message = fallback) => res.status(status).json({ error: message });

export const errorForbidden = errorWith(403, 'Forbidden');
export const errorInternalError = errorWith(500, 'Internal Error');
export const errorNotFound = errorWith(404, 'Resource Not Found');
export const errorUnauthorized = errorWith(401, 'Unauthorized');
export const errorWrongArgs = errorWith(400, 'Wrong Arguments');

/**
 * Error carrying an HTTP status and the exact JSON body Laravel would emit.
 * Thrown from services/middleware and rendered by the central error handler.
 */
export class HttpError extends Error {
  constructor(status, body, message) {
    super(message ?? (typeof body?.message === 'string' ? body.message : `HTTP ${status}`));
    this.status = status;
    this.body = body;
  }
}

/** Laravel's rendering of HttpException with APP_DEBUG=false: {"message": "..."} */
export const httpException = (status, message = '') => new HttpError(status, { message });
