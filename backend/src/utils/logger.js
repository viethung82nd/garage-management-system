/**
 * Minimal dependency-free logger. Centralizes the console prefix convention
 * (`[scope] message`) used across the app so it's one place to swap in a
 * real logging library (Winston/Pino) later without touching call sites.
 */
function line(scope, level, args) {
  const prefix = `[${scope}]`;
  const method = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  method(prefix, ...args);
}

export const logger = {
  info: (scope, ...args) => line(scope, "info", args),
  warn: (scope, ...args) => line(scope, "warn", args),
  error: (scope, ...args) => line(scope, "error", args),
};
