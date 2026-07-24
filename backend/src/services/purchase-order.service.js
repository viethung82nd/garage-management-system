import { purchaseOrderRepository } from "../repositories/purchase-order.repository.js";
import { supplierRepository } from "../repositories/supplier.repository.js";
import { partRepository } from "../repositories/part.repository.js";
import { PURCHASE_ORDER_STATUSES } from "../models/purchase-order.model.js";
import { ApiError } from "../utils/apiError.js";
import { runInTransaction } from "../utils/transaction.js";
import { generateCode } from "../utils/sequence.js";
import { receiveStock } from "../utils/stock.js";
import { logAudit } from "../utils/audit.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function assertOid(id, label) {
  if (typeof id !== "string" || !OID_RE.test(id)) {
    throw new ApiError(400, `Invalid ${label} format`);
  }
}

function parseOptionalDate(value, label) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return date;
}

/**
 * Validates and normalises a raw `lines` payload into embedded PO-line
 * documents. Shared by create and (draft-only) update so both go through the
 * exact same checks — an over-receivable line that slipped past creation
 * would just surface later as a confusing over-receipt rejection.
 */
async function normalizeLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new ApiError(400, "At least one line item is required");
  }

  const normalized = [];
  for (const [index, line] of lines.entries()) {
    const label = `Line ${index + 1}`;
    if (!line || typeof line.partId !== "string" || !OID_RE.test(line.partId)) {
      throw new ApiError(400, `${label}: a valid partId is required`);
    }
    if (typeof line.quantity !== "number" || !(line.quantity > 0)) {
      throw new ApiError(400, `${label}: quantity must be a positive number`);
    }
    if (typeof line.unitCost !== "number" || !(line.unitCost >= 0)) {
      throw new ApiError(400, `${label}: unitCost must be a non-negative number`);
    }
    if (
      line.repairOrderId !== undefined &&
      line.repairOrderId !== null &&
      line.repairOrderId !== "" &&
      !OID_RE.test(line.repairOrderId)
    ) {
      throw new ApiError(400, `${label}: invalid repairOrderId format`);
    }

    const part = await partRepository.findById(line.partId);
    if (!part) {
      throw new ApiError(400, `${label}: part not found`);
    }

    normalized.push({
      partId: line.partId,
      description: line.description?.trim() || part.name,
      quantity: line.quantity,
      unitCost: line.unitCost,
      receivedQuantity: 0,
      repairOrderId: line.repairOrderId || undefined,
    });
  }

  return normalized;
}

function computeSubtotal(lines) {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
}

/**
 * Opens a new purchase order in `draft`. Nothing here touches stock or the
 * supplier ledger yet — that only happens once the order is actually sent and
 * (later) received; a draft is purely a working document that can still be
 * freely edited.
 */
export async function createPurchaseOrder(
  { supplierId, lines, expectedAt, notes, dueAt, backorderForRepairOrderId },
  actorId,
) {
  assertOid(supplierId, "supplierId");
  const supplier = await supplierRepository.findById(supplierId);
  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }
  if (!supplier.isActive) {
    throw new ApiError(400, "Cannot raise a purchase order against an inactive supplier");
  }

  const normalizedLines = await normalizeLines(lines);
  const subtotal = computeSubtotal(normalizedLines);

  const parsedExpectedAt = parseOptionalDate(expectedAt, "expectedAt date");
  const parsedDueAt =
    parseOptionalDate(dueAt, "dueAt date") ??
    // Default off the supplier's own terms so payables ageing has something
    // to measure against even when nobody set a due date by hand.
    new Date(Date.now() + (supplier.paymentTermDays ?? 30) * DAY_MS);

  if (
    backorderForRepairOrderId !== undefined &&
    backorderForRepairOrderId !== null &&
    backorderForRepairOrderId !== ""
  ) {
    assertOid(backorderForRepairOrderId, "backorderForRepairOrderId");
  }

  const code = await generateCode("PO");

  return purchaseOrderRepository.create({
    code,
    supplierId,
    status: "draft",
    lines: normalizedLines,
    subtotal,
    expectedAt: parsedExpectedAt,
    notes: notes?.trim() || undefined,
    createdBy: actorId,
    backorderForRepairOrderId: backorderForRepairOrderId || undefined,
    amountDue: subtotal,
    amountPaid: 0,
    paymentStatus: "unpaid",
    dueAt: parsedDueAt,
  });
}

/**
 * Edits a purchase order. Draft only — once it has been sent, the supplier is
 * already acting on the quantities/prices we told them, so changing the
 * document out from under a receipt in progress would desync what we expect
 * against what actually shows up.
 */
export async function updatePurchaseOrder(
  id,
  { lines, expectedAt, notes, dueAt, backorderForRepairOrderId },
) {
  assertOid(id, "purchase order id");
  const po = await purchaseOrderRepository.findById(id);
  if (!po) {
    throw new ApiError(404, "Purchase order not found");
  }
  if (po.status !== "draft") {
    throw new ApiError(409, "Only a draft purchase order can be edited");
  }

  if (lines !== undefined) {
    const normalizedLines = await normalizeLines(lines);
    po.lines = normalizedLines;
    po.subtotal = computeSubtotal(normalizedLines);
    // Still a draft, so nothing can have been paid yet — but recompute
    // amountDue defensively rather than assume that invariant holds.
    po.amountDue = po.subtotal;
  }
  if (expectedAt !== undefined) {
    po.expectedAt = parseOptionalDate(expectedAt, "expectedAt date");
  }
  if (dueAt !== undefined) {
    po.dueAt = parseOptionalDate(dueAt, "dueAt date");
  }
  if (notes !== undefined) {
    po.notes = notes?.trim() || undefined;
  }
  if (backorderForRepairOrderId !== undefined) {
    if (backorderForRepairOrderId === null || backorderForRepairOrderId === "") {
      po.backorderForRepairOrderId = undefined;
    } else {
      assertOid(backorderForRepairOrderId, "backorderForRepairOrderId");
      po.backorderForRepairOrderId = backorderForRepairOrderId;
    }
  }

  await po.save();
  return po;
}

/** Commits a draft to the supplier. Purely a status flip — the actual "tell
 *  the supplier" step (email/print) is outside this system's scope. */
export async function sendPurchaseOrder(id) {
  assertOid(id, "purchase order id");
  const po = await purchaseOrderRepository.findById(id);
  if (!po) {
    throw new ApiError(404, "Purchase order not found");
  }
  if (po.status !== "draft") {
    throw new ApiError(409, `Cannot send a purchase order in status "${po.status}"`);
  }

  po.status = "sent";
  await po.save();
  return po;
}

/**
 * Records goods physically arriving against one or more lines of a sent
 * purchase order. This is the one purchasing operation with real
 * consequences elsewhere, so it runs as a single transaction covering three
 * documents: the Part (stock + moving-average cost), the InventoryTransaction
 * ledger (via utils/stock.js#receiveStock) and this PurchaseOrder's own
 * per-line `receivedQuantity`/overall `status`. A partial commit would leave
 * stock bumped with no record of which PO it came from, or a PO marked
 * received with the stock never actually added.
 *
 * Deliveries routinely arrive in more than one shipment, so this is designed
 * to be called repeatedly against the same PO — each call only ever adds to
 * `receivedQuantity`, never resets it, and over-receiving past what was
 * ordered on a line is rejected outright rather than silently capped (an
 * over-receipt is exactly the kind of mismatch a paper receiving process is
 * supposed to catch, so it's surfaced as an error rather than absorbed).
 */
export async function receiveGoods(poId, { lines, note }, actorId) {
  assertOid(poId, "purchase order id");
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new ApiError(400, "At least one line receipt is required");
  }

  const po = await runInTransaction(async (session) => {
    const order = await purchaseOrderRepository.model.findById(poId).session(session);
    if (!order) {
      throw new ApiError(404, "Purchase order not found");
    }
    if (!["sent", "partiallyReceived"].includes(order.status)) {
      throw new ApiError(
        409,
        `Cannot receive goods against a purchase order in status "${order.status}"`,
      );
    }

    for (const receipt of lines) {
      const lineIndex = receipt?.lineIndex;
      const quantity = receipt?.quantity;

      if (typeof lineIndex !== "number" || !Number.isInteger(lineIndex) || !order.lines[lineIndex]) {
        throw new ApiError(400, `Invalid lineIndex "${lineIndex}"`);
      }
      if (typeof quantity !== "number" || !(quantity > 0)) {
        throw new ApiError(400, `Line ${lineIndex}: quantity must be a positive number`);
      }

      const line = order.lines[lineIndex];
      const alreadyReceived = line.receivedQuantity || 0;
      const remaining = line.quantity - alreadyReceived;

      if (quantity > remaining) {
        throw new ApiError(
          400,
          `Line ${lineIndex}: cannot receive ${quantity} — only ${remaining} of ${line.quantity} ordered remain outstanding`,
        );
      }

      await receiveStock(
        {
          partId: line.partId,
          quantity,
          unitCost: line.unitCost,
          purchaseOrderId: order._id,
          actorId,
          reason: note?.trim() || `Received against PO ${order.code}`,
        },
        session,
      );

      line.receivedQuantity = alreadyReceived + quantity;
    }

    order.status = order.lines.every((line) => (line.receivedQuantity || 0) >= line.quantity)
      ? "received"
      : "partiallyReceived";

    await order.save({ session });
    return order;
  });

  await logAudit({
    action: "stockAdjusted",
    actorId,
    targetModel: "PurchaseOrder",
    targetId: po._id,
    details: `Received goods against PO ${po.code}${note?.trim() ? ` — ${note.trim()}` : ""} (now ${po.status})`,
  });

  return po;
}

/** Abandons a purchase order before any of it arrived. Once even one unit has
 *  been received, the stock/cost/ledger effects are already real and cannot
 *  be quietly undone by flipping a status — that would need an explicit
 *  return-to-supplier flow instead, which is out of scope here. */
export async function cancelPurchaseOrder(id) {
  assertOid(id, "purchase order id");
  const po = await purchaseOrderRepository.findById(id);
  if (!po) {
    throw new ApiError(404, "Purchase order not found");
  }
  if (po.status === "cancelled") {
    throw new ApiError(409, "Purchase order is already cancelled");
  }

  const anyReceived = po.lines.some((line) => (line.receivedQuantity || 0) > 0);
  if (anyReceived) {
    throw new ApiError(409, "Cannot cancel a purchase order that has already received goods");
  }

  po.status = "cancelled";
  await po.save();
  return po;
}

/**
 * Records a payment made to the supplier against this order's outstanding
 * balance. Mirrors payment.service.js#recordPayment's shape (customer
 * invoices) on the payables side: an amount can never exceed what's actually
 * owed, so `paymentStatus` can only ever legitimately reach "paid", never an
 * overpaid state that would need its own handling everywhere downstream.
 */
export async function recordSupplierPayment(poId, { amount, reference }, actorId) {
  assertOid(poId, "purchase order id");
  const po = await purchaseOrderRepository.findById(poId);
  if (!po) {
    throw new ApiError(404, "Purchase order not found");
  }
  if (po.status === "cancelled") {
    throw new ApiError(409, "Cannot record a payment against a cancelled purchase order");
  }

  const outstanding = Math.max(0, (po.amountDue || 0) - (po.amountPaid || 0));
  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    throw new ApiError(400, "amount must be a positive number");
  }
  if (amount > outstanding) {
    throw new ApiError(400, `amount must not exceed the outstanding balance (${outstanding})`);
  }

  po.amountPaid = (po.amountPaid || 0) + amount;
  const remaining = po.amountDue - po.amountPaid;
  po.paymentStatus = remaining <= 0 ? "paid" : "partiallyPaid";
  await po.save();

  const trimmedReference = typeof reference === "string" ? reference.trim() : "";
  await logAudit({
    action: "paymentRecorded",
    actorId,
    targetModel: "PurchaseOrder",
    targetId: po._id,
    details:
      `${amount.toLocaleString("vi-VN")} ₫ paid to supplier against PO ${po.code}` +
      (trimmedReference ? ` (ref ${trimmedReference})` : "") +
      (remaining <= 0
        ? " — paid in full"
        : ` — ${remaining.toLocaleString("vi-VN")} ₫ still outstanding`),
  });

  return po;
}

export async function listPurchaseOrders({ supplierId, status } = {}) {
  const filter = {};

  if (supplierId) {
    assertOid(supplierId, "supplierId");
    filter.supplierId = supplierId;
  }
  if (status && status !== "all") {
    if (!PURCHASE_ORDER_STATUSES.includes(status)) {
      throw new ApiError(400, `status must be one of: ${PURCHASE_ORDER_STATUSES.join(", ")}`);
    }
    filter.status = status;
  }

  return purchaseOrderRepository.model
    .find(filter)
    .populate("supplierId", "name code")
    .sort({ createdAt: -1 });
}

export async function getPurchaseOrderById(id) {
  assertOid(id, "purchase order id");
  const po = await purchaseOrderRepository.model
    .findById(id)
    .populate("supplierId", "name code contactName phone email paymentTermDays")
    .populate("lines.partId", "name sku unit");

  if (!po) {
    throw new ApiError(404, "Purchase order not found");
  }
  return po;
}

/**
 * Outstanding payables per supplier, bucketed by how many days past `dueAt`
 * the balance is. Cancelled orders never owe anything and fully-paid orders
 * have nothing outstanding, so both are excluded up front; everything else is
 * grouped by supplier so an accountant can see who to chase first.
 */
export async function getPayablesReport() {
  const orders = await purchaseOrderRepository.model
    .find({ status: { $ne: "cancelled" }, paymentStatus: { $ne: "paid" } })
    .populate("supplierId", "name code");

  const now = Date.now();
  const bySupplier = new Map();

  for (const po of orders) {
    const outstanding = Math.max(0, (po.amountDue || 0) - (po.amountPaid || 0));
    if (outstanding <= 0) continue;

    const supplierKey = po.supplierId?._id?.toString() || "unknown";
    if (!bySupplier.has(supplierKey)) {
      bySupplier.set(supplierKey, {
        supplierId: po.supplierId?._id,
        supplierName: po.supplierId?.name || "Unknown supplier",
        supplierCode: po.supplierId?.code,
        outstanding: 0,
        // "current" = not yet past its due date (or has no due date at all);
        // the remaining four buckets are exactly the ageing windows asked
        // for, in days past dueAt.
        buckets: { current: 0, "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
        orders: [],
      });
    }

    const entry = bySupplier.get(supplierKey);
    entry.outstanding += outstanding;
    entry.orders.push({
      purchaseOrderId: po._id,
      code: po.code,
      outstanding,
      dueAt: po.dueAt,
    });

    const daysPastDue = po.dueAt ? Math.floor((now - po.dueAt.getTime()) / DAY_MS) : -1;
    if (daysPastDue <= 0) entry.buckets.current += outstanding;
    else if (daysPastDue <= 30) entry.buckets["0-30"] += outstanding;
    else if (daysPastDue <= 60) entry.buckets["31-60"] += outstanding;
    else if (daysPastDue <= 90) entry.buckets["61-90"] += outstanding;
    else entry.buckets["90+"] += outstanding;
  }

  const suppliers = Array.from(bySupplier.values()).sort((a, b) => b.outstanding - a.outstanding);
  const totalOutstanding = suppliers.reduce((sum, entry) => sum + entry.outstanding, 0);

  return { suppliers, totalOutstanding };
}

/**
 * Active parts whose free-to-sell stock has fallen to or below their reorder
 * point, each with a suggested quantity to bring stock back up to `maxStock`
 * (never less than 1 — a part that qualifies at all is always worth ordering
 * something) and the preferred supplier to raise the PO against, so
 * purchasing staff can turn this straight into a draft order.
 */
export async function getReorderSuggestions() {
  const parts = await partRepository.model
    .find({ isActive: true })
    .populate("supplierId", "name code leadTimeDays");

  const suggestions = [];
  for (const part of parts) {
    const available = Math.max(0, (part.stockQuantity || 0) - (part.reservedQuantity || 0));
    if (available > (part.reorderPoint || 0)) continue;

    const suggestedQuantity = Math.max(1, (part.maxStock || 0) - available);
    suggestions.push({
      partId: part._id,
      sku: part.sku,
      name: part.name,
      stockQuantity: part.stockQuantity || 0,
      reservedQuantity: part.reservedQuantity || 0,
      available,
      reorderPoint: part.reorderPoint || 0,
      maxStock: part.maxStock,
      suggestedQuantity,
      preferredSupplier: part.supplierId || null,
    });
  }

  return { suggestions };
}
