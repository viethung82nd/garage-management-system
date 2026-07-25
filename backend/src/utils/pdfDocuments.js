import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";

// Business documents (quote/invoice) attached to email — pdfkit renders a
// real vector PDF server-side with no browser/Chromium dependency, unlike
// the frontend's html2canvas-based export (shared/lib/pdf-export.ts), which
// only works against an already-rendered DOM element in a real browser.

const NAVY = "#1e3a5f";
const RED = "#f51304";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";

// pdfkit's built-in standard-14 fonts (Helvetica/Helvetica-Bold) only cover
// WinAnsi/Latin-1 — they cannot render Vietnamese diacritics (Nguyễn, Huỳnh,
// Phường...), which is virtually all of this app's real customer/vehicle
// data. Noto Sans is bundled instead and registered per-document below.
const FONTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "fonts");
const FONT_REGULAR = "NotoSans";
const FONT_BOLD = "NotoSans-Bold";

function registerFonts(doc) {
  doc.registerFont(FONT_REGULAR, path.join(FONTS_DIR, "NotoSans-Regular.ttf"));
  doc.registerFont(FONT_BOLD, path.join(FONTS_DIR, "NotoSans-Bold.ttf"));
}

function money(value) {
  // The bundled Noto Sans subset has no glyph for the ₫ currency SIGN
  // (U+20AB) — it silently falls back to another glyph. "đ" (the ordinary
  // Vietnamese letter) is also how amounts are written colloquially, so it's
  // used here instead of risking a garbled symbol in a real PDF.
  return `${Math.round(value || 0).toLocaleString("vi-VN")}đ`;
}

/** Collects everything written to `doc` into a single Buffer. */
function renderToBuffer(build) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      registerFonts(doc);
      doc.font(FONT_REGULAR);
      build(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function drawHeader(doc, { title, code, badge }) {
  doc
    .rect(doc.page.margins.left, doc.page.margins.top, doc.page.width - doc.page.margins.left - doc.page.margins.right, 64)
    .fill(NAVY);

  doc
    .fillColor("#ffffff")
    .fontSize(18)
    .font(FONT_BOLD)
    .text("KAPA AUTO CARE CENTER", doc.page.margins.left + 16, doc.page.margins.top + 14);

  doc
    .fillColor("rgba(255,255,255,0.75)")
    .fontSize(9)
    .font(FONT_REGULAR)
    .text(title.toUpperCase(), doc.page.margins.left + 16, doc.page.margins.top + 38);

  if (code) {
    doc
      .fillColor("#ffffff")
      .fontSize(13)
      .font(FONT_BOLD)
      .text(code, doc.page.margins.left, doc.page.margins.top + 14, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 16,
        align: "right",
      });
  }
  if (badge) {
    doc
      .fillColor("rgba(255,255,255,0.75)")
      .fontSize(9)
      .font(FONT_REGULAR)
      .text(badge, doc.page.margins.left, doc.page.margins.top + 38, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 16,
        align: "right",
      });
  }

  doc.y = doc.page.margins.top + 64 + 24;
}

function drawMetaRow(doc, pairs) {
  const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / pairs.length;
  const startY = doc.y;
  pairs.forEach((pair, index) => {
    const x = doc.page.margins.left + index * colWidth;
    doc
      .fillColor(MUTED)
      .fontSize(8)
      .font(FONT_BOLD)
      .text(pair.label.toUpperCase(), x, startY, { width: colWidth - 12, characterSpacing: 0.5 });
    doc
      .fillColor("#0f172a")
      .fontSize(11)
      .font(FONT_BOLD)
      .text(pair.value || "—", x, startY + 12, { width: colWidth - 12 });
  });
  doc.y = startY + 40;
}

function drawLineItemsTable(doc, lines) {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const cols = { desc: left, qty: left + width * 0.55, price: left + width * 0.68, total: left + width * 0.84 };
  const colWidths = { desc: width * 0.55, qty: width * 0.13, price: width * 0.16, total: width * 0.16 };

  function headerRow() {
    doc.rect(left, doc.y, width, 22).fill("#f5f6f8");
    doc.fillColor(MUTED).fontSize(8).font(FONT_BOLD);
    doc.text("DESCRIPTION", cols.desc + 8, doc.y + 7, { width: colWidths.desc - 8 });
    doc.text("QTY", cols.qty, doc.y + 7, { width: colWidths.qty, align: "right" });
    doc.text("UNIT PRICE", cols.price, doc.y + 7, { width: colWidths.price, align: "right" });
    doc.text("AMOUNT", cols.total, doc.y + 7, { width: colWidths.total - 8, align: "right" });
    doc.y += 22;
  }

  headerRow();

  for (const line of lines) {
    const qty = Number(line.quantity) || 1;
    const unitPrice = Number(line.unitPrice) || 0;
    const rowHeight = 22;

    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom - 120) {
      doc.addPage();
      doc.y = doc.page.margins.top;
      headerRow();
    }

    doc.fillColor("#0f172a").fontSize(9).font(FONT_REGULAR);
    doc.text(line.description || "Line item", cols.desc + 8, doc.y + 6, { width: colWidths.desc - 16 });
    doc.text(String(qty), cols.qty, doc.y + 6, { width: colWidths.qty, align: "right" });
    doc.text(money(unitPrice), cols.price, doc.y + 6, { width: colWidths.price, align: "right" });
    doc.text(money(qty * unitPrice), cols.total, doc.y + 6, { width: colWidths.total - 8, align: "right" });

    doc.moveTo(left, doc.y + rowHeight).lineTo(left + width, doc.y + rowHeight).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.y += rowHeight;
  }

  doc.y += 12;
}

function drawTotals(doc, rows) {
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const boxWidth = 220;
  const left = doc.page.margins.left + width - boxWidth;

  for (const row of rows) {
    doc
      .fillColor(row.emphasis ? "#0f172a" : MUTED)
      .fontSize(row.emphasis ? 12 : 9)
      .font(row.emphasis ? FONT_BOLD : FONT_REGULAR)
      .text(row.label, left, doc.y, { width: boxWidth - 90 });
    doc
      .fillColor(row.emphasis ? RED : "#0f172a")
      .fontSize(row.emphasis ? 12 : 9)
      .font(row.emphasis ? FONT_BOLD : FONT_REGULAR)
      .text(row.value, left + boxWidth - 90, doc.y - (row.emphasis ? 1 : 0), { width: 90, align: "right" });
    doc.y += row.emphasis ? 20 : 16;
  }
}

function drawFooter(doc, note) {
  doc.moveDown(2);
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .font(FONT_REGULAR)
    .text(note, doc.page.margins.left, doc.y, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    });
}

/** A vertically-stacked label/value list (Issued date, Service date, Repair
 *  order, Payment method, ...) — distinct from drawMetaRow's horizontal
 *  columns, matching the invoice's own meta-table layout. */
function drawKeyValueList(doc, rows) {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  for (const row of rows) {
    doc.fillColor(MUTED).fontSize(9).font(FONT_REGULAR).text(row.label, left, doc.y, { width: width * 0.45 });
    doc
      .fillColor("#0f172a")
      .fontSize(9)
      .font(FONT_BOLD)
      .text(row.value || "—", left + width * 0.45, doc.y - 11, { width: width * 0.55, align: "right" });
    doc.y += 15;
  }
}

/** Two-column "Billed to" / "Vehicle details" block, matching
 *  InvoiceDocument.tsx's __parties layout — the same canonical invoice
 *  template every other view in the app renders. */
function drawParties(doc, { billedToLines, vehicleFacts }) {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = width / 2;
  const startY = doc.y;

  doc.fillColor(MUTED).fontSize(8).font(FONT_BOLD).text("BILLED TO", left, startY, { characterSpacing: 0.5 });
  let leftY = startY + 14;
  billedToLines.filter(Boolean).forEach((line, index) => {
    doc
      .fillColor("#0f172a")
      .fontSize(index === 0 ? 11 : 9)
      .font(index === 0 ? FONT_BOLD : FONT_REGULAR)
      .text(line, left, leftY, { width: colWidth - 20 });
    leftY += index === 0 ? 16 : 13;
  });

  doc
    .fillColor(MUTED)
    .fontSize(8)
    .font(FONT_BOLD)
    .text("VEHICLE DETAILS", left + colWidth, startY, { characterSpacing: 0.5 });
  let rightY = startY + 14;
  vehicleFacts.forEach((fact) => {
    doc.fillColor(MUTED).fontSize(8).font(FONT_REGULAR).text(fact.label, left + colWidth, rightY);
    doc
      .fillColor("#0f172a")
      .fontSize(10)
      .font(FONT_BOLD)
      .text(fact.value || "—", left + colWidth, rightY + 11, { width: colWidth - 20 });
    rightY += 28;
  });

  doc.y = Math.max(leftY, rightY) + 12;
  doc.moveTo(left, doc.y).lineTo(left + width, doc.y).strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.y += 16;
}

/** Renders a ServiceQuote to a PDF buffer, attached to the "quote ready" email. */
export function renderQuotationPdf(quote) {
  return renderToBuffer((doc) => {
    drawHeader(doc, { title: "Repair Quote", code: quote.code, badge: quote.status ? quote.status.toUpperCase() : undefined });

    drawMetaRow(doc, [
      { label: "Customer", value: quote.customerName },
      { label: "Vehicle", value: [quote.vehicleName, quote.vehiclePlate].filter(Boolean).join(" · ") },
      { label: "Date", value: new Date(quote.createdAt || Date.now()).toLocaleDateString("vi-VN") },
    ]);

    drawLineItemsTable(doc, quote.lines || []);

    const subtotal = (quote.lines || []).reduce(
      (sum, line) => sum + (Number(line.quantity) || 1) * (Number(line.unitPrice) || 0),
      0,
    );
    const discountAmount = (subtotal * (quote.discountPercent || 0)) / 100;
    const taxAmount = ((subtotal - discountAmount) * (quote.taxPercent || 0)) / 100;

    const rows = [{ label: "Subtotal", value: money(subtotal) }];
    if (quote.discountPercent) rows.push({ label: `Discount (${quote.discountPercent}%)`, value: `-${money(discountAmount)}` });
    if (quote.taxPercent) rows.push({ label: `Tax (${quote.taxPercent}%)`, value: money(taxAmount) });
    rows.push({ label: "Total estimate", value: money(quote.totalEstimate || subtotal - discountAmount + taxAmount), emphasis: true });
    drawTotals(doc, rows);

    if (quote.note) {
      const left = doc.page.margins.left;
      const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      doc.moveDown(1);
      doc.fillColor("#0f172a").fontSize(9).font(FONT_BOLD).text("Notes", left, doc.y, { width });
      doc.fillColor(MUTED).fontSize(9).font(FONT_REGULAR).text(quote.note, left, doc.y, { width });
    }

    drawFooter(doc, "This is an estimate — final cost may vary if additional work is approved during the repair. Kapa Auto Care Center.");
  });
}

/**
 * Renders an Invoice to a PDF buffer, attached to the "invoice ready" email.
 * Mirrors shared/ui/invoice/InvoiceDocument.tsx's structure and field
 * sourcing (customer/vehicle straight off the populated repair order, not
 * the invoice's own `billing` snapshot, which isn't reliably set) — the
 * same document every other invoice view in the app renders, not a
 * thinner one-off just for email.
 *
 * @param {object} params
 * @param {string} params.code
 * @param {string} params.status
 * @param {Date|string} params.issuedAt
 * @param {Date|string} [params.serviceDate]
 * @param {string} [params.repairOrderCode]
 * @param {string} [params.paymentMethod]
 * @param {string} params.customerName
 * @param {string} [params.customerPhone]
 * @param {string} [params.customerEmail]
 * @param {string} [params.vehicleLabel]
 * @param {string} [params.plate]
 * @param {string} [params.vin]
 * @param {string} [params.mileage]
 * @param {Array<{description: string, quantity: number, unitPrice: number}>} params.lineItems
 * @param {number} params.subtotal
 * @param {number} params.discount
 * @param {number} params.tax
 * @param {number} params.total
 * @param {number} params.amountPaid
 */
export function renderInvoicePdf(params) {
  return renderToBuffer((doc) => {
    drawHeader(doc, {
      title: "Tax Invoice",
      code: params.code,
      badge: params.status ? params.status.toUpperCase() : undefined,
    });

    drawKeyValueList(doc, [
      { label: "Issued date", value: new Date(params.issuedAt || Date.now()).toLocaleString("vi-VN") },
      params.serviceDate
        ? { label: "Service date", value: new Date(params.serviceDate).toLocaleDateString("vi-VN") }
        : null,
      { label: "Repair order", value: params.repairOrderCode },
      { label: "Payment method", value: params.paymentMethod || "Not yet paid" },
    ].filter(Boolean));
    doc.y += 8;

    drawParties(doc, {
      billedToLines: [params.customerName, params.customerPhone, params.customerEmail],
      vehicleFacts: [
        { label: "Make / model", value: params.vehicleLabel },
        { label: "Plate", value: params.plate },
        { label: "VIN", value: params.vin },
        { label: "Odometer", value: params.mileage },
      ],
    });

    drawLineItemsTable(doc, params.lineItems || []);

    const rows = [{ label: "Subtotal", value: money(params.subtotal) }];
    if (params.discount) rows.push({ label: "Discount", value: `-${money(params.discount)}` });
    if (params.tax) rows.push({ label: "Tax", value: money(params.tax) });
    rows.push({ label: "Total", value: money(params.total), emphasis: true });
    if (params.amountPaid) rows.push({ label: "Paid so far", value: `-${money(params.amountPaid)}` });
    rows.push({
      label: "Balance due",
      value: money(Math.max(0, (params.total || 0) - (params.amountPaid || 0))),
      emphasis: true,
    });
    drawTotals(doc, rows);

    drawFooter(doc, "Please settle at the service desk or by bank transfer as agreed. Thank you for choosing Kapa Auto Care Center.");
  });
}
