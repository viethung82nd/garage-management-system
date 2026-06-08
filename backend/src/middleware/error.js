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
  const message = err instanceof Error ? err.message : "Internal server error";
  console.error("[error]", message);
  res.status(500).json({ error: "Internal server error" });
}
