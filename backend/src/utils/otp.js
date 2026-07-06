import crypto from "crypto";

/** How long a freshly issued OTP stays valid. */
export const OTP_TTL_MS = 10 * 60 * 1000;

/** Max wrong guesses before a code is locked and the user must request a new one. */
export const MAX_OTP_ATTEMPTS = 5;

/** Cryptographically-strong 6-digit numeric code, always zero-padded to 6. */
export function generateOtpCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/** One-way hash of a code for at-rest storage. Fast by design; brute-force is
 *  bounded by MAX_OTP_ATTEMPTS + the short TTL, not by the hash cost. */
export function hashOtpCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

/**
 * Delivers an OTP to the user. No mail/SMS transport is configured yet, so this
 * logs the code for local development. Swap the body for a real provider
 * (nodemailer, Twilio, …) without touching any caller.
 */
export function deliverOtp({ email, code, purpose }) {
  console.log(`[otp] ${purpose} code for ${email}: ${code}`);
}
