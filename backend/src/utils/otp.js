import crypto from "crypto";
import { sendEmail } from "./mailer.js";
import { renderEmailLayout, BRAND } from "./emailTemplate.js";

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
  const minutes = Math.round(OTP_TTL_MS / 60000);

  const html = renderEmailLayout({
    preheader: `Mã xác thực của bạn: ${code}`,
    heading: `Mã xác thực ${label}`,
    bodyHtml: `
      <p style="margin:0 0 8px;">Xin chào,</p>
      <p style="margin:0;">Đây là mã xác thực (OTP) cho yêu cầu <strong>${label}</strong> của bạn. Mã có hiệu lực trong <strong>${minutes} phút</strong>.</p>
      <div style="margin:20px 0 0;padding:12px 16px;background:#fffbeb;border-left:3px solid ${BRAND.amber};border-radius:6px;font-size:13px;color:${BRAND.ink};">
        Không chia sẻ mã này với bất kỳ ai, kể cả nhân viên Kapa. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
      </div>
    `,
    highlight: { label: "Mã xác thực", value: code.split("").join("&nbsp;") },
  });

  await sendEmail({ to: email, subject: `Mã OTP ${label} của bạn`, html });
}
