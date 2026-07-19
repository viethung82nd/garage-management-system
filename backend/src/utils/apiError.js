/**
 * Error carrying an HTTP status. Throw from services/controllers to produce a
 * clean JSON error response instead of a generic 500.
 */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
