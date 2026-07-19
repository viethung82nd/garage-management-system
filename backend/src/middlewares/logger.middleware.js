import { logger } from "../utils/logger.js";

/**
 * Request logger. Logs one line per request once the response is flushed,
 * capturing method, URL, status code, and how long the handler took. Mounted
 * first so it observes every request, including those that 404.
 */
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info(
      "req",
      `${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`,
    );
  });

  next();
}
