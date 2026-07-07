import { UserModel, OtpModel } from "../models/index.js";
import { OTP_PURPOSES } from "../models/Otp.js";
import { HttpError } from "../middleware/error.js";
import { signAccessToken } from "../utils/jwt.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import {
  generateOtpCode,
  hashOtpCode,
  deliverOtp,
  OTP_TTL_MS,
  MAX_OTP_ATTEMPTS,
} from "../utils/otp.js";
import { env } from "../config/env.js";

/**
 * Roles that can hold a password and log in. `walkInCustomer` is excluded on
 * purpose: walk-in customers have no account and use lookup codes instead.
 */
export const LOGIN_ROLES = [
  "onlineCustomer",
  "serviceAdvisor",
  "technician",
  "accountant",
  "admin",
];

/** Staff roles an admin is allowed to create via POST /api/auth/staff. */
const STAFF_ROLES = ["serviceAdvisor", "technician", "accountant", "admin"];

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function validateCredentials({ fullName, email, password }) {
  if (!fullName || !fullName.trim()) {
    throw new HttpError(400, "fullName is required");
  }
  if (!email || !EMAIL_RE.test(email)) {
    throw new HttpError(400, "A valid email is required");
  }
  if (!password || password.length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters");
  }
}

function toAuthResponse(user) {
  const token = signAccessToken({ sub: user._id.toString(), role: user.role });
  return { token, user };
}

/** POST /api/auth/register — public sign-up, always an online customer. */
export async function register(req, res) {
  const { fullName, email, phone, password } = req.body ?? {};
  validateCredentials({ fullName, email, password });

  const existing = await UserModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new HttpError(409, "Email is already registered");
  }

  const user = await UserModel.create({
    fullName,
    email,
    phone,
    passwordHash: await hashPassword(password),
    role: "onlineCustomer",
    accountType: "registered",
  });

  res.status(201).json(toAuthResponse(user));
}

/** POST /api/auth/login — email + password for any of the 5 login roles. */
export async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    throw new HttpError(400, "email and password are required");
  }

  const user = await UserModel.findOne({ email: email.toLowerCase() });
  // Same message for unknown email and wrong password — no account probing.
  if (!user || !user.passwordHash || !LOGIN_ROLES.includes(user.role)) {
    throw new HttpError(401, "Invalid email or password");
  }
  if (!(await comparePassword(password, user.passwordHash))) {
    throw new HttpError(401, "Invalid email or password");
  }
  if (!user.isActive) {
    throw new HttpError(403, "Account is deactivated");
  }

  res.json(toAuthResponse(user));
}

/** GET /api/auth/me — profile of the authenticated user. */
export async function me(req, res) {
  const user = await UserModel.findById(req.user.sub);
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  res.json({ user });
}

/** POST /api/auth/staff — admin creates staff accounts (advisor/tech/accountant/admin). */
export async function createStaff(req, res) {
  const { fullName, email, phone, password, role } = req.body ?? {};
  validateCredentials({ fullName, email, password });
  if (!STAFF_ROLES.includes(role)) {
    throw new HttpError(400, `role must be one of: ${STAFF_ROLES.join(", ")}`);
  }

  const existing = await UserModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new HttpError(409, "Email is already registered");
  }

  const user = await UserModel.create({
    fullName,
    email,
    phone,
    passwordHash: await hashPassword(password),
    role,
    accountType: "registered",
    createdBy: req.user.sub,
  });

  res.status(201).json({ user });
}

// ============= PROFILE (update / delete own account) =============

/**
 * PUT /api/auth/me — the authenticated user updates their own profile. Supports
 * name/phone/email changes and a password change (requires the current
 * password). Changing email clears the verified flag so it must be re-verified.
 */
export async function updateMe(req, res) {
  const user = await UserModel.findById(req.user.sub);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const { fullName, phone, email, currentPassword, newPassword } = req.body ?? {};

  if (fullName !== undefined) {
    if (!fullName.trim()) {
      throw new HttpError(400, "fullName cannot be empty");
    }
    user.fullName = fullName.trim();
  }

  if (phone !== undefined) {
    user.phone = phone?.trim() || undefined;
  }

  if (email !== undefined && email.toLowerCase() !== user.email) {
    if (!EMAIL_RE.test(email)) {
      throw new HttpError(400, "A valid email is required");
    }
    const existing = await UserModel.findOne({
      email: email.toLowerCase(),
      _id: { $ne: user._id },
    });
    if (existing) {
      throw new HttpError(409, "Email is already registered");
    }
    user.email = email.toLowerCase();
    user.isEmailVerified = false;
  }

  if (newPassword !== undefined) {
    if (!user.passwordHash) {
      throw new HttpError(400, "Account has no password set");
    }
    if (
      !currentPassword ||
      !(await comparePassword(currentPassword, user.passwordHash))
    ) {
      throw new HttpError(401, "Current password is incorrect");
    }
    if (newPassword.length < 8) {
      throw new HttpError(400, "Password must be at least 8 characters");
    }
    user.passwordHash = await hashPassword(newPassword);
  }

  await user.save();
  res.json({ user });
}

/**
 * DELETE /api/auth/me — the authenticated user deletes their account. This is a
 * soft delete: the account is deactivated (isActive=false) so it can no longer
 * log in, while bookings/vehicles/reviews keep their references intact.
 */
export async function deleteMe(req, res) {
  const user = await UserModel.findById(req.user.sub);
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  user.isActive = false;
  await user.save();
  res.json({ message: "Account deactivated" });
}

// ============= OTP (forgot password + email verification) =============

/**
 * Issues a fresh OTP for an email + purpose, superseding any previous unconsumed
 * code, and "delivers" it. Returns the plain code so callers can expose it in
 * non-production for testing.
 */
async function issueOtp(email, purpose) {
  const code = generateOtpCode();
  await OtpModel.deleteMany({ email, purpose, consumedAt: null });
  await OtpModel.create({
    email,
    purpose,
    codeHash: hashOtpCode(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  deliverOtp({ email, code, purpose });
  return code;
}

/**
 * Validates a submitted code against the newest live OTP for email + purpose.
 * Increments attempts on a wrong guess and locks after MAX_OTP_ATTEMPTS. When
 * `consume` is true the code is marked spent so it cannot be reused.
 */
async function checkOtp(email, purpose, code, { consume }) {
  if (!code) {
    throw new HttpError(400, "otp is required");
  }
  const otp = await OtpModel.findOne({ email, purpose, consumedAt: null }).sort({
    createdAt: -1,
  });
  if (!otp || otp.expiresAt < new Date()) {
    throw new HttpError(400, "Invalid or expired OTP");
  }
  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    throw new HttpError(429, "Too many attempts. Please request a new OTP.");
  }
  if (otp.codeHash !== hashOtpCode(code)) {
    otp.attempts += 1;
    await otp.save();
    throw new HttpError(400, "Invalid or expired OTP");
  }
  if (consume) {
    otp.consumedAt = new Date();
    await otp.save();
  }
  return otp;
}

/** Adds the plain OTP to a response body only outside production, for testing. */
function withDevCode(body, code) {
  if (code && env.nodeEnv !== "production") {
    return { ...body, devCode: code };
  }
  return body;
}

/**
 * POST /api/auth/forgot-password — starts password recovery. Always responds 200
 * to avoid revealing whether an email is registered; an OTP is only issued for a
 * real login-capable account.
 * Body: { email }
 */
export async function forgotPassword(req, res) {
  const { email } = req.body ?? {};
  if (!email || !EMAIL_RE.test(email)) {
    throw new HttpError(400, "A valid email is required");
  }
  const normalized = email.toLowerCase();
  const user = await UserModel.findOne({ email: normalized });

  let code;
  if (user && user.passwordHash && LOGIN_ROLES.includes(user.role)) {
    code = await issueOtp(normalized, "passwordReset");
  }

  res.json(
    withDevCode(
      { message: "If an account exists for that email, an OTP has been sent." },
      code
    )
  );
}

/**
 * POST /api/auth/send-otp — issues an email-verification OTP for an existing
 * account (e.g. right after registration).
 * Body: { email, purpose? }  purpose defaults to "emailVerification".
 */
export async function sendOtp(req, res) {
  const { email, purpose = "emailVerification" } = req.body ?? {};
  if (!email || !EMAIL_RE.test(email)) {
    throw new HttpError(400, "A valid email is required");
  }
  if (!OTP_PURPOSES.includes(purpose)) {
    throw new HttpError(400, `purpose must be one of: ${OTP_PURPOSES.join(", ")}`);
  }
  const normalized = email.toLowerCase();
  const user = await UserModel.findOne({ email: normalized });
  if (!user) {
    throw new HttpError(404, "No account found for that email");
  }

  const code = await issueOtp(normalized, purpose);
  res.json(withDevCode({ message: "OTP sent" }, code));
}

/**
 * POST /api/auth/verify-otp — verifies an OTP. For "emailVerification" the code
 * is consumed and the account is marked verified. For "passwordReset" this is a
 * non-consuming validity check (the code is spent later by reset-password).
 * Body: { email, otp, purpose? }
 */
export async function verifyOtp(req, res) {
  const { email, otp, purpose = "emailVerification" } = req.body ?? {};
  if (!email || !EMAIL_RE.test(email)) {
    throw new HttpError(400, "A valid email is required");
  }
  if (!OTP_PURPOSES.includes(purpose)) {
    throw new HttpError(400, `purpose must be one of: ${OTP_PURPOSES.join(", ")}`);
  }
  const normalized = email.toLowerCase();

  if (purpose === "emailVerification") {
    await checkOtp(normalized, purpose, otp, { consume: true });
    await UserModel.updateOne(
      { email: normalized },
      { isEmailVerified: true }
    );
    return res.json({ verified: true });
  }

  // passwordReset: confirm validity without spending the code.
  await checkOtp(normalized, purpose, otp, { consume: false });
  res.json({ valid: true });
}

/**
 * POST /api/auth/reset-password — completes password recovery by consuming a
 * valid passwordReset OTP and setting a new password.
 * Body: { email, otp, newPassword }
 */
export async function resetPassword(req, res) {
  const { email, otp, newPassword } = req.body ?? {};
  if (!email || !EMAIL_RE.test(email)) {
    throw new HttpError(400, "A valid email is required");
  }
  if (!newPassword || newPassword.length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters");
  }
  const normalized = email.toLowerCase();

  await checkOtp(normalized, "passwordReset", otp, { consume: true });

  const user = await UserModel.findOne({ email: normalized });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  res.json({ message: "Password has been reset. You can now log in." });
}
