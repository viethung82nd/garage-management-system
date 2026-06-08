import { verifyAccessToken } from "../utils/jwt.js";

/**
 * Requires a valid `Authorization: Bearer <token>` header. Attaches the decoded
 * payload to `req.user`. Ready to drop onto any protected route.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
