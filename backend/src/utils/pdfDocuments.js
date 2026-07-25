import PDFDocument from "pdfkit";

// Business documents (quote/invoice) attached to email — pdfkit renders a
// real vector PDF server-side with no browser/Chromium dependency, unlike
// the frontend's html2canvas-based export (shared/lib/pdf-export.ts), which
// only works against an already-rendered DOM element in a real browser.

const NAVY = "#1e3a5f";
const RED = "#f51304";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";

function money(value) {
  return `${Math.round(value || 0).toLocaleString("vi-VN")} ₫`;
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
    .font("Helvetica-Bold")
    .text("KAPA AUTO CARE CENTER", doc.page.margins.left + 16, doc.page.margins.top + 14);

  doc
    .fillColor("rgba(255,255,255,0.75)")
    .fontSize(9)
    .font("Helvetica")
    .text(title.toUpperCase(), doc.page.margins.left + 16, doc.page.margins.top + 38);

  if (code) {
    doc
      .fillColor("#ffffff")
      .fontSize(13)
      .font("Helvetica-Bold")
      .text(code, doc.page.margins.left, doc.page.margins.top + 14, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 16,
        align: "right",
      });
  }
  if (badge) {
    doc
      .fillColor("rgba(255,255,255,0.75)")
      .fontSize(9)
      .font("Helvetica")
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
      .font("Helvetica-Bold")
      .text(pair.label.toUpperCase(), x, startY, { width: colWidth - 12, characterSpacing: 0.5 });
    doc
      .fillColor("#0f172a")
      .fontSize(11)
      .font("Helvetica-Bold")
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
    doc.fillColor(MUTED).fontSize(8).font("Helvetica-Bold");
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

    doc.fillColor("#0f172a").fontSize(9).font("Helvetica");
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
      .font(row.emphasis ? "Helvetica-Bold" : "Helvetica")
      .text(row.label, left, doc.y, { width: boxWidth - 90 });
    doc
      .fillColor(row.emphasis ? RED : "#0f172a")
      .fontSize(row.emphasis ? 12 : 9)
      .font(row.emphasis ? "Helvetica-Bold" : "Helvetica")
      .text(row.value, left + boxWidth - 90, doc.y - (row.emphasis ? 1 : 0), { width: 90, align: "right" });
    doc.y += row.emphasis ? 20 : 16;
  }
}

function drawFooter(doc, note) {
  doc.moveDown(2);
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .font("Helvetica")
    .text(note, doc.page.margins.left, doc.y, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    });
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
      doc.moveDown(1);
      doc.fillColor("#0f172a").fontSize(9).font("Helvetica-Bold").text("Notes");
      doc.fillColor(MUTED).fontSize(9).font("Helvetica").text(quote.note, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
    }

    drawFooter(doc, "This is an estimate — final cost may vary if additional work is approved during the repair. Kapa Auto Care Center.");
  });
}

/** Renders an Invoice to a PDF buffer, attached to the "invoice ready" email. */
export function renderInvoicePdf(invoice) {
  return renderToBuffer((doc) => {
    drawHeader(doc, { title: "Invoice", code: invoice.code, badge: invoice.status ? invoice.status.toUpperCase() : undefined });

    drawMetaRow(doc, [
      { label: "Customer", value: invoice.billing?.customerName },
      { label: "Vehicle", value: [invoice.billing?.vehiclePlate].filter(Boolean).join(" · ") },
      { label: "Issued", value: new Date(invoice.issuedAt || Date.now()).toLocaleDateString("vi-VN") },
    ]);

    drawLineItemsTable(doc, invoice.lineItems || []);

    const rows = [{ label: "Subtotal", value: money(invoice.subtotal) }];
    if (invoice.discount) rows.push({ label: "Discount", value: `-${money(invoice.discount)}` });
    if (invoice.taxAmount) rows.push({ label: "Tax", value: money(invoice.taxAmount) });
    rows.push({ label: "Total", value: money(invoice.total), emphasis: true });
    if (invoice.amountPaid) rows.push({ label: "Paid", value: `-${money(invoice.amountPaid)}` });
    if (invoice.amountPaid) rows.push({ label: "Balance due", value: money(invoice.total - invoice.amountPaid), emphasis: true });
    drawTotals(doc, rows);

    drawFooter(doc, "Please settle at the service desk or by bank transfer as agreed. Kapa Auto Care Center.");
  });
}
