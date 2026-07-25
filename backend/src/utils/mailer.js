import nodemailer from "nodemailer";

let cachedTransporter;
let warnedMissingConfig = false;

function getTransporter() {
  if (cachedTransporter !== undefined) {
    return cachedTransporter;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    cachedTransporter = null;
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Nodemailer's defaults (multiple minutes) would otherwise let a stalled
    // SMTP connection hang far longer than any caller should ever wait.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });

  return cachedTransporter;
}

/**
 * Sends a real email via SMTP. Best-effort, same spirit as
 * createNotification: a failed or unconfigured mail send must never break
 * the business action that triggered it, so errors are logged and swallowed
 * rather than thrown.
 *
 * @param {{ to: string, subject: string, html: string,
 *           attachments?: Array<{ filename: string, content: Buffer, contentType?: string }> }} params
 */
export async function sendEmail({ to, subject, html, attachments }) {
  if (!to) return false;

  const transporter = getTransporter();
  if (!transporter) {
    if (!warnedMissingConfig) {
      console.warn(
        "[mailer] SMTP_HOST/SMTP_USER/SMTP_PASS not configured — skipping email send. Set them in .env to enable real delivery."
      );
      warnedMissingConfig = true;
    }
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      attachments,
    });
    return true;
  } catch (err) {
    console.warn("[mailer] failed to send email:", err?.message ?? err);
    return false;
  }
}
