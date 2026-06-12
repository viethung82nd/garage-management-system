/**
 * Error carrying an HTTP status. Throw from controllers to produce a clean
 * JSON error response instead of a generic 500.
 */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Wraps an async route handler so rejections reach the error handler. */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** Fallback 404 for unmatched routes. */
export function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
}

/**
 * Central error handler. Express recognizes it by its four-argument signature,
 * so every thrown/`next(err)` error funnels through one place.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  const status = err instanceof HttpError ? err.status : 500;
  const message =
    status < 500 && err instanceof Error ? err.message : "Internal server error";
  if (status >= 500) {
    console.error("[error]", err instanceof Error ? err.stack : err);
  }
  res.status(status).json({ error: message });
}
