import * as authService from "../services/auth.service.js";

/** POST /api/auth/register — public sign-up, always an online customer. */
export async function register(req, res) {
  const result = await authService.register(req.body ?? {});
  res.status(201).json(result);
}

/** POST /api/auth/login — email + password for any of the 5 login roles. */
export async function login(req, res) {
  const result = await authService.login(req.body ?? {});
  res.json(result);
}

/** GET /api/auth/me — profile of the authenticated user. */
export async function me(req, res) {
  const result = await authService.getMe(req.user.sub);
  res.json(result);
}

/** POST /api/auth/staff — admin creates staff accounts (advisor/tech/accountant/admin). */
export async function createStaff(req, res) {
  const result = await authService.createStaff(req.body ?? {}, req.user.sub);
  res.status(201).json(result);
}

/**
 * PUT /api/auth/me — the authenticated user updates their own profile. Supports
 * name/phone/email changes and a password change (requires the current
 * password). Changing email clears the verified flag so it must be re-verified.
 */
export async function updateMe(req, res) {
  const result = await authService.updateMe(req.user.sub, req.body ?? {});
  res.json(result);
}

/**
 * DELETE /api/auth/me — the authenticated user deletes their account. This is a
 * soft delete: the account is deactivated (isActive=false) so it can no longer
 * log in, while bookings/vehicles/reviews keep their references intact.
 */
export async function deleteMe(req, res) {
  const result = await authService.deleteMe(req.user.sub);
  res.json(result);
}

/**
 * POST /api/auth/forgot-password — starts password recovery. Always responds 200
 * to avoid revealing whether an email is registered; an OTP is only issued for a
 * real login-capable account.
 * Body: { email }
 */
export async function forgotPassword(req, res) {
  const result = await authService.forgotPassword(req.body ?? {});
  res.json(result);
}

/**
 * POST /api/auth/send-otp — issues an email-verification OTP for an existing
 * account (e.g. right after registration).
 * Body: { email, purpose? }  purpose defaults to "emailVerification".
 */
export async function sendOtp(req, res) {
  const result = await authService.sendOtp(req.body ?? {});
  res.json(result);
}

/**
 * POST /api/auth/verify-otp — verifies an OTP. For "emailVerification" the code
 * is consumed and the account is marked verified. For "passwordReset" this is a
 * non-consuming validity check (the code is spent later by reset-password).
 * Body: { email, otp, purpose? }
 */
export async function verifyOtp(req, res) {
  const result = await authService.verifyOtp(req.body ?? {});
  res.json(result);
}

/**
 * POST /api/auth/reset-password — completes password recovery by consuming a
 * valid passwordReset OTP and setting a new password.
 * Body: { email, otp, newPassword }
 */
export async function resetPassword(req, res) {
  const result = await authService.resetPassword(req.body ?? {});
  res.json(result);
}
