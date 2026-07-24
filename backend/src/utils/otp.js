import crypto from "crypto";
import { sendEmail } from "./mailer.js";

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

/** Vietnamese, human-facing label for each OTP purpose — used in the email subject/body. */
const PURPOSE_LABELS = {
  passwordReset: "đặt lại mật khẩu",
  emailVerification: "xác thực email",
};

/**
 * Delivers an OTP to the user's inbox via `sendEmail`. Previously this only
 * `console.log`-ged the code, which is fine for local dev but leaks live,
 * usable codes into server logs (and log aggregators, CI output, etc.) once
 * deployed — anyone with log access could reset a password or verify an
 * email they don't own. Sending the code by email instead means it only ever
 * reaches the address it was issued for.
 *
 * `sendEmail` is async, best-effort, and swallows its own errors (it no-ops
 * with a console warning when SMTP isn't configured), so this function is
 * safe to call without the caller awaiting it — same fire-and-forget shape
 * as before, just with real delivery instead of a log line.
 */
export async function deliverOtp({ email, code, purpose }) {
  const label = PURPOSE_LABELS[purpose] ?? purpose;
  const html = `
    <p>Xin chào,</p>
    <p>Mã xác thực (OTP) của bạn cho yêu cầu <strong>${label}</strong> là:</p>
    <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
    <p>Mã này có hiệu lực trong ${Math.round(OTP_TTL_MS / 60000)} phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
    <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
  `;
  await sendEmail({ to: email, subject: `Mã OTP ${label} của bạn`, html });
}
