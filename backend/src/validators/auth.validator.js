/**
 * Hand-rolled request validators (no Joi/Zod dependency yet). Each function
 * takes the parsed body and returns an error message, or nothing if valid —
 * the shape `validateBody()` in middlewares/validate.middleware.js expects.
 * These mirror the checks services/auth.service.js already performs; wiring
 * them at the route layer lets a bad request fail before touching the DB.
 */

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function validateRegisterBody({ fullName, email, password } = {}) {
  if (!fullName || !fullName.trim()) {
    return "fullName is required";
  }
  if (!email || !EMAIL_RE.test(email)) {
    return "A valid email is required";
  }
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters";
  }
  return null;
}

export function validateLoginBody({ email, password } = {}) {
  if (!email || !password) {
    return "email and password are required";
  }
  return null;
}
