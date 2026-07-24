import { userRepository } from "../repositories/user.repository.js";
import { otpRepository } from "../repositories/otp.repository.js";
import { OTP_PURPOSES } from "../models/otp.model.js";
import { ApiError } from "../utils/apiError.js";
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
  "qcInspector",
  "partsStaff",
  "accountant",
  "admin",
];

/** Staff roles an admin is allowed to create via POST /api/auth/staff. */
const STAFF_ROLES = [
  "serviceAdvisor",
  "technician",
  "qcInspector",
  "partsStaff",
  "accountant",
  "admin",
];

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function validateCredentials({ fullName, email, password }) {
  if (!fullName || !fullName.trim()) {
    throw new ApiError(400, "fullName is required");
  }
  if (!email || !EMAIL_RE.test(email)) {
    throw new ApiError(400, "A valid email is required");
  }
  if (!password || password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }
}

function toAuthResponse(user) {
  const token = signAccessToken({ sub: user._id.toString(), role: user.role });
  return { token, user };
}

/** Public sign-up, always an online customer. */
export async function register({ fullName, email, phone, password }) {
  validateCredentials({ fullName, email, password });

  const existing = await userRepository.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, "Email is already registered");
  }

  const user = await userRepository.create({
    fullName,
    email,
    phone,
    passwordHash: await hashPassword(password),
    role: "onlineCustomer",
    accountType: "registered",
  });

  return toAuthResponse(user);
}

/** Email + password login for any of the 5 login roles. */
export async function login({ email, password }) {
  if (!email || !password) {
    throw new ApiError(400, "email and password are required");
  }

  const user = await userRepository.findOne({ email: email.toLowerCase() });
  // Same message for unknown email and wrong password — no account probing.
  if (!user || !user.passwordHash || !LOGIN_ROLES.includes(user.role)) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (!(await comparePassword(password, user.passwordHash))) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (!user.isActive) {
    throw new ApiError(403, "Account is deactivated");
  }

  return toAuthResponse(user);
}

/** Profile of the authenticated user. */
export async function getMe(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return { user };
}

/** Admin creates staff accounts (advisor/tech/accountant/admin). */
export async function createStaff({ fullName, email, phone, password, role }, createdBy) {
  validateCredentials({ fullName, email, password });
  if (!STAFF_ROLES.includes(role)) {
    throw new ApiError(400, `role must be one of: ${STAFF_ROLES.join(", ")}`);
  }

  const existing = await userRepository.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, "Email is already registered");
  }

  const user = await userRepository.create({
    fullName,
    email,
    phone,
    passwordHash: await hashPassword(password),
    role,
    accountType: "registered",
    createdBy,
  });

  return { user };
}

/**
 * The authenticated user updates their own profile. Supports name/phone/email
 * changes and a password change (requires the current password). Changing
 * email clears the verified flag so it must be re-verified.
 */
export async function updateMe(
  userId,
  { fullName, phone, email, currentPassword, newPassword },
) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (fullName !== undefined) {
    if (!fullName.trim()) {
      throw new ApiError(400, "fullName cannot be empty");
    }
    user.fullName = fullName.trim();
  }

  if (phone !== undefined) {
    user.phone = phone?.trim() || undefined;
  }

  if (email !== undefined && email.toLowerCase() !== user.email) {
    if (!EMAIL_RE.test(email)) {
      throw new ApiError(400, "A valid email is required");
    }
    const existing = await userRepository.findOne({
      email: email.toLowerCase(),
      _id: { $ne: user._id },
    });
    if (existing) {
      throw new ApiError(409, "Email is already registered");
    }
    user.email = email.toLowerCase();
    user.isEmailVerified = false;
  }

  if (newPassword !== undefined) {
    if (!user.passwordHash) {
      throw new ApiError(400, "Account has no password set");
    }
    if (
      !currentPassword ||
      !(await comparePassword(currentPassword, user.passwordHash))
    ) {
      throw new ApiError(401, "Current password is incorrect");
    }
    if (newPassword.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }
    user.passwordHash = await hashPassword(newPassword);
  }

  await user.save();
  return { user };
}

/**
 * The authenticated user deletes their account. This is a soft delete: the
 * account is deactivated (isActive=false) so it can no longer log in, while
 * bookings/vehicles/reviews keep their references intact.
 */
export async function deleteMe(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  user.isActive = false;
  await user.save();
  return { message: "Account deactivated" };
}

// ============= OTP (forgot password + email verification) =============

/**
 * Issues a fresh OTP for an email + purpose, superseding any previous unconsumed
 * code, and "delivers" it. Returns the plain code so callers can expose it in
 * non-production for testing.
 */
async function issueOtp(email, purpose) {
  const code = generateOtpCode();
  await otpRepository.model.deleteMany({ email, purpose, consumedAt: null });
  await otpRepository.create({
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
    throw new ApiError(400, "otp is required");
  }
  const otp = await otpRepository
    .findOne({ email, purpose, consumedAt: null })
    .sort({ createdAt: -1 });
  if (!otp || otp.expiresAt < new Date()) {
    throw new ApiError(400, "Invalid or expired OTP");
  }
  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    throw new ApiError(429, "Too many attempts. Please request a new OTP.");
  }
  if (otp.codeHash !== hashOtpCode(code)) {
    otp.attempts += 1;
    await otp.save();
    throw new ApiError(400, "Invalid or expired OTP");
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
 * Starts password recovery. Always responds successfully to avoid revealing
 * whether an email is registered; an OTP is only issued for a real
 * login-capable account.
 */
export async function forgotPassword({ email }) {
  if (!email || !EMAIL_RE.test(email)) {
    throw new ApiError(400, "A valid email is required");
  }
  const normalized = email.toLowerCase();
  const user = await userRepository.findOne({ email: normalized });

  let code;
  if (user && user.passwordHash && LOGIN_ROLES.includes(user.role)) {
    code = await issueOtp(normalized, "passwordReset");
  }

  return withDevCode(
    { message: "If an account exists for that email, an OTP has been sent." },
    code,
  );
}

/**
 * Issues an email-verification OTP for an existing account (e.g. right after
 * registration). `purpose` defaults to "emailVerification".
 */
export async function sendOtp({ email, purpose = "emailVerification" }) {
  if (!email || !EMAIL_RE.test(email)) {
    throw new ApiError(400, "A valid email is required");
  }
  if (!OTP_PURPOSES.includes(purpose)) {
    throw new ApiError(400, `purpose must be one of: ${OTP_PURPOSES.join(", ")}`);
  }
  const normalized = email.toLowerCase();
  const user = await userRepository.findOne({ email: normalized });
  if (!user) {
    throw new ApiError(404, "No account found for that email");
  }

  const code = await issueOtp(normalized, purpose);
  return withDevCode({ message: "OTP sent" }, code);
}

/**
 * Verifies an OTP. For "emailVerification" the code is consumed and the
 * account is marked verified. For "passwordReset" this is a non-consuming
 * validity check (the code is spent later by resetPassword).
 */
export async function verifyOtp({ email, otp, purpose = "emailVerification" }) {
  if (!email || !EMAIL_RE.test(email)) {
    throw new ApiError(400, "A valid email is required");
  }
  if (!OTP_PURPOSES.includes(purpose)) {
    throw new ApiError(400, `purpose must be one of: ${OTP_PURPOSES.join(", ")}`);
  }
  const normalized = email.toLowerCase();

  if (purpose === "emailVerification") {
    await checkOtp(normalized, purpose, otp, { consume: true });
    await userRepository.model.updateOne(
      { email: normalized },
      { isEmailVerified: true },
    );
    return { verified: true };
  }

  // passwordReset: confirm validity without spending the code.
  await checkOtp(normalized, purpose, otp, { consume: false });
  return { valid: true };
}

/**
 * Completes password recovery by consuming a valid passwordReset OTP and
 * setting a new password.
 */
export async function resetPassword({ email, otp, newPassword }) {
  if (!email || !EMAIL_RE.test(email)) {
    throw new ApiError(400, "A valid email is required");
  }
  if (!newPassword || newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }
  const normalized = email.toLowerCase();

  await checkOtp(normalized, "passwordReset", otp, { consume: true });

  const user = await userRepository.findOne({ email: normalized });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  return { message: "Password has been reset. You can now log in." };
}
