/**
 * Thin, uniform response helper. Deliberately does NOT wrap payloads in an
 * envelope (`{ data: ... }`) — existing endpoints return raw bodies and the
 * frontend depends on those exact shapes, so this only standardizes how
 * controllers send a status + body, not what the body looks like.
 */
export function sendResponse(res, statusCode, payload) {
  return res.status(statusCode).json(payload);
}
