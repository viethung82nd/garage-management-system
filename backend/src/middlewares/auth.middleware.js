import { verifyAccessToken } from "../utils/jwt.js";
import { userRepository } from "../repositories/user.repository.js";

/**
 * Requires a valid `Authorization: Bearer <token>` header. Attaches the decoded
 * payload to `req.user`. Ready to drop onto any protected route.
 *
 * Beyond verifying the JWT signature, this also re-loads the user from the DB
 * on every request. Access tokens are long-lived (7d by default), so the JWT
 * alone can't reflect an account that was deactivated or had its role changed
 * *after* the token was issued — without this check, a deactivated user (or
 * one demoted from admin) would keep full access for up to a week.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  try {
    const user = await userRepository.findById(payload.sub);
    if (!user || user.isActive === false) {
      res.status(401).json({ error: "Account is inactive or no longer exists" });
      return;
    }

    // Keep the JWT's sub/role as the canonical shape existing consumers read,
    // but refresh role from the DB so a mid-lifetime role change (e.g. demoted
    // from admin) takes effect immediately instead of waiting for the token
    // to expire.
    req.user = { sub: payload.sub, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Restricts a route to the given roles. Must run after `requireAuth`.
 * Usage: router.post("/staff", requireAuth, requireRole("admin"), handler)
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
