import { ApiError } from "../utils/apiError.js";
import { logger } from "../utils/logger.js";

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
  let status = 500;
  let message = "Internal server error";

  if (err instanceof ApiError) {
    status = err.status;
    message = err.message;
  } else if (err?.name === "ValidationError" || err?.name === "CastError") {
    // Mongoose schema/cast failures are bad client input, not server faults.
    status = 400;
    message = err.message;
  } else if (err?.code === 11000) {
    // Duplicate key on a unique index.
    status = 409;
    message = "Resource already exists";
  } else if (err?.type === "entity.too.large" || err?.status === 413) {
    // express.json() rejects an oversized body before any route runs — e.g.
    // too many/too large walk-around photos embedded as base64 in a
    // reception payload. Surface it plainly instead of a bare 500.
    status = 413;
    message = "Request is too large — try attaching fewer or smaller photos.";
  } else if (err?.type === "entity.parse.failed") {
    status = 400;
    message = "Malformed JSON in request body";
  }

  if (status >= 500) {
    logger.error("error", err instanceof Error ? err.stack : err);
  }
  res.status(status).json({ error: message });
}
