// Shared HTML chrome for every transactional email the app sends (quote
// ready, invoice ready, additional-service proposal, OTP). Built once here
// instead of per-caller so every email looks like it came from the same
// product, and so the email-client-compatibility rules (table layout,
// inline styles only, no external CSS/fonts/images) only have to be gotten
// right in one place.
//
// Email clients are not browsers: Outlook desktop renders with Word's HTML
// engine (no flexbox/grid, patchy border-radius/background support), many
// clients block remote images and strip <style> blocks, and web fonts
// silently fall back anyway — so this deliberately uses table-based layout,
// inline styles, and a system-font stack rather than the app's own Tailwind
// classes or Google Fonts.

const BRAND = {
  name: "Kapa Auto Care Center",
  navy: "#1e3a5f",
  red: "#f51304",
  green: "#16a34a",
  amber: "#d97706",
  canvas: "#f5f6f8",
  border: "#e2e8f0",
  textMuted: "#64748b",
  ink: "#0f172a",
};

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));
}

/**
 * A bulletproof (table-based) button, safe in Outlook where a plain
 * `<a>` styled via CSS padding/background frequently renders unstyled.
 */
function renderButton({ label, url, color = BRAND.red }) {
  if (!label || !url) return "";
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 4px;">
      <tr>
        <td style="border-radius:8px;background:${color};" bgcolor="${color}">
          <a href="${escapeHtml(url)}" target="_blank"
             style="display:inline-block;padding:14px 32px;font-family:${FONT_STACK};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

/**
 * A labelled value line (e.g. "Total estimate — 2,020,000 ₫") inside a
 * light card, used to surface the one number/fact each email is really
 * about instead of burying it in a paragraph.
 */
function renderHighlight({ label, value, color = BRAND.navy }) {
  if (!value) return "";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="margin:20px 0;background:${BRAND.canvas};border:1px solid ${BRAND.border};border-radius:10px;">
      <tr>
        <td style="padding:16px 20px;text-align:center;">
          <div style="font-family:${FONT_STACK};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.textMuted};margin-bottom:6px;">
            ${escapeHtml(label)}
          </div>
          <div style="font-family:${FONT_STACK};font-size:24px;font-weight:700;color:${color};">
            ${value}
          </div>
        </td>
      </tr>
    </table>`;
}

/**
 * Wraps `bodyHtml` (already-escaped/trusted inline HTML — callers own their
 * own content) in the shared header/footer chrome.
 *
 * @param {{ preheader?: string, heading: string, bodyHtml: string,
 *           button?: { label: string, url: string, color?: string },
 *           highlight?: { label: string, value: string, color?: string } }} params
 */
export function renderEmailLayout({ preheader = "", heading, bodyHtml, button, highlight }) {
  return `<!DOCTYPE html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${escapeHtml(BRAND.name)}</title>
<!--[if mso]>
<style type="text/css">table,td,div,h1,h2,h3,p{font-family:Arial,sans-serif !important;}</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background:${BRAND.canvas};">
  <!-- Preheader: hidden preview text shown next to the subject in the inbox list -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.canvas};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:${BRAND.navy};border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
              <div style="font-family:${FONT_STACK};font-size:22px;font-weight:800;letter-spacing:0.05em;color:#ffffff;">
                KAPA
              </div>
              <div style="font-family:${FONT_STACK};font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.65);margin-top:2px;">
                Auto Care Center
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background:#ffffff;border:1px solid ${BRAND.border};border-top:none;padding:36px 32px;">
              <h1 style="margin:0 0 16px;font-family:${FONT_STACK};font-size:20px;font-weight:700;color:${BRAND.ink};">
                ${escapeHtml(heading)}
              </h1>
              <div style="font-family:${FONT_STACK};font-size:15px;line-height:1.65;color:${BRAND.ink};">
                ${bodyHtml}
              </div>
              ${highlight ? renderHighlight(highlight) : ""}
              ${button ? `<div style="text-align:center;">${renderButton(button)}</div>` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:${BRAND.canvas};border-radius:0 0 12px 12px;padding:24px 32px;text-align:center;">
              <div style="font-family:${FONT_STACK};font-size:12px;line-height:1.6;color:${BRAND.textMuted};">
                ${escapeHtml(BRAND.name)}<br />
                This is an automated message — please don't reply directly to this email.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export { BRAND, escapeHtml };
