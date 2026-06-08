import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * Signs a short-lived access token for an authenticated user.
 * @param {{ sub: string, role: string }} payload
 * @returns {string}
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

/**
 * Verifies and decodes an access token, throwing if invalid or expired.
 * @param {string} token
 * @returns {{ sub: string, role: string }}
 */
export function verifyAccessToken(token) {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (typeof decoded === "string" || !decoded.sub || !decoded.role) {
    throw new Error("Invalid token payload");
  }
  return { sub: String(decoded.sub), role: decoded.role };
}
