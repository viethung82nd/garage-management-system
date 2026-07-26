import nodemailer from "nodemailer";
import dns from "node:dns/promises";

let warnedMissingConfig = false;

const IPV4_LITERAL = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Resolves the SMTP host to an IPv4 address, or returns null if that isn't
 * possible.
 *
 * Nodemailer does its own DNS work: it calls dns.resolve4() and dns.resolve6()
 * directly and concatenates the results, so whenever the IPv4 branch comes back
 * empty (or errors) it hands net.connect an IPv6 address. Render's containers
 * have no outbound IPv6 route, so that connection dies instantly with
 * ENETUNREACH and every email silently fails. Because nodemailer bypasses
 * dns.lookup(), neither --dns-result-order nor dns.setDefaultResultOrder()
 * influences it — pinning the address ourselves is the only reliable fix.
 */
async function resolveIpv4(hostname) {
  if (IPV4_LITERAL.test(hostname)) return hostname;
  try {
    const [address] = await dns.resolve4(hostname);
    return address || null;
  } catch {
    return null;
  }
}

/**
 * Built per send rather than cached: creating a transport opens no socket, and
 * re-resolving each time avoids pinning a single provider IP for the lifetime
 * of the process.
 */
async function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  const ipv4 = await resolveIpv4(SMTP_HOST);

  return nodemailer.createTransport({
    // Connect straight to the IPv4 address, but keep the real hostname as the
    // TLS servername so SNI and certificate validation still match.
    host: ipv4 || SMTP_HOST,
    servername: SMTP_HOST,
    family: 4,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Nodemailer's defaults (multiple minutes) would otherwise let a stalled
    // SMTP connection hang far longer than any caller should ever wait.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
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

  const transporter = await createTransporter();
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
