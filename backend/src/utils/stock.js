import {
  PartModel,
  InventoryTransactionModel,
  StockReservationModel,
} from "../models/index.js";
import { logAudit } from "./audit.js";

/**
 * Every change to physical stock goes through this module. Nothing else may
 * write `stockQuantity` directly — that was the original defect: the quantity
 * was a free-form number an admin typed, disconnected from the work actually
 * being done, so selling a part never reduced it.
 *
 * All helpers take an optional `session` and must be called inside a
 * transaction whenever they are paired with another write (issuing parts and
 * completing an order, receiving goods and updating a purchase order), so
 * stock can never drift from the document that justified the movement.
 */

/** Free-to-sell quantity for a part document. */
export function availableOf(part) {
  return Math.max(0, (part.stockQuantity || 0) - (part.reservedQuantity || 0));
}

/**
 * Holds stock for an approved repair order.
 *
 * Reserves as much as is actually available rather than refusing outright: by
 * the time this runs the customer has already agreed to the work, so the right
 * outcome is to commit what we have and report the shortfall for purchasing —
 * not to fail the approval and lose the sale.
 *
 * @returns {{reserved: number, shortfall: number}}
 */
export async function reserveStock(
  { partId, repairOrderId, quantity, actorId },
  session,
) {
  const part = await PartModel.findById(partId).session(session ?? null);
  if (!part) {
    return { reserved: 0, shortfall: quantity };
  }

  const available = availableOf(part);
  const reserved = Math.min(available, quantity);
  const shortfall = quantity - reserved;

  if (reserved > 0) {
    part.reservedQuantity = (part.reservedQuantity || 0) + reserved;
    await part.save({ session });
  }

  await StockReservationModel.create(
    [{ partId, repairOrderId, quantity: reserved, shortfall, status: "active" }],
    { session },
  );

  if (shortfall > 0) {
    await logAudit({
      action: "stockAdjusted",
      actorId,
      repairOrderId,
      targetModel: "Part",
      targetId: partId,
      details: `Short ${shortfall} × ${part.name} (${part.sku}) when reserving for repair order`,
    });
  }

  return { reserved, shortfall };
}

/**
 * Issues reserved stock to a repair order: the parts physically leave the
 * store. Converts active reservations into `issue` ledger entries, freezing
 * the unit cost so historical margin stays correct even after the part is
 * repriced.
 *
 * @returns {{issued: Array<{partId: any, quantity: number, unitCost: number}>}}
 */
export async function issueReservedStock({ repairOrderId, actorId }, session) {
  const reservations = await StockReservationModel.find({
    repairOrderId,
    status: "active",
  }).session(session ?? null);

  const issued = [];

  for (const reservation of reservations) {
    if (reservation.quantity <= 0) {
      reservation.status = "consumed";
      reservation.resolvedAt = new Date();
      await reservation.save({ session });
      continue;
    }

    const part = await PartModel.findById(reservation.partId).session(session ?? null);
    if (!part) continue;

    const quantity = Math.min(reservation.quantity, part.stockQuantity || 0);
    part.stockQuantity = (part.stockQuantity || 0) - quantity;
    part.reservedQuantity = Math.max(0, (part.reservedQuantity || 0) - reservation.quantity);
    await part.save({ session });

    await InventoryTransactionModel.create(
      [
        {
          partId: part._id,
          type: "issue",
          quantity,
          unitCost: part.costPrice || 0,
          balanceAfter: part.stockQuantity,
          repairOrderId,
          reason: "Issued to repair order",
          actorId,
        },
      ],
      { session },
    );

    reservation.status = "consumed";
    reservation.resolvedAt = new Date();
    await reservation.save({ session });

    issued.push({ partId: part._id, quantity, unitCost: part.costPrice || 0 });
  }

  return { issued };
}

/** Frees stock held for an order that was cancelled or had lines removed. */
export async function releaseReservations({ repairOrderId, actorId }, session) {
  const reservations = await StockReservationModel.find({
    repairOrderId,
    status: "active",
  }).session(session ?? null);

  for (const reservation of reservations) {
    if (reservation.quantity > 0) {
      const part = await PartModel.findById(reservation.partId).session(session ?? null);
      if (part) {
        part.reservedQuantity = Math.max(
          0,
          (part.reservedQuantity || 0) - reservation.quantity,
        );
        await part.save({ session });
      }
    }
    reservation.status = "released";
    reservation.resolvedAt = new Date();
    await reservation.save({ session });
  }

  if (reservations.length > 0) {
    await logAudit({
      action: "stockAdjusted",
      actorId,
      repairOrderId,
      details: `Released ${reservations.length} stock reservation(s)`,
    });
  }

  return { released: reservations.length };
}

/**
 * Receives stock from a supplier and rolls the moving-average cost forward.
 *
 * Averaging on receipt (rather than storing the latest price) keeps cost of
 * goods sold stable when the same part is bought at different prices, which is
 * the normal case.
 */
export async function receiveStock(
  { partId, quantity, unitCost, purchaseOrderId, actorId, reason },
  session,
) {
  const part = await PartModel.findById(partId).session(session ?? null);
  if (!part) return null;

  const previousQty = part.stockQuantity || 0;
  const previousCost = part.costPrice || 0;
  const incomingCost = Number(unitCost);

  if (!Number.isNaN(incomingCost) && incomingCost >= 0) {
    const totalQty = previousQty + quantity;
    part.costPrice =
      totalQty > 0
        ? Math.round((previousQty * previousCost + quantity * incomingCost) / totalQty)
        : incomingCost;
  }

  part.stockQuantity = previousQty + quantity;
  await part.save({ session });

  await InventoryTransactionModel.create(
    [
      {
        partId: part._id,
        type: "receipt",
        quantity,
        unitCost: Number.isNaN(incomingCost) ? part.costPrice : incomingCost,
        balanceAfter: part.stockQuantity,
        purchaseOrderId,
        reason: reason || "Goods received",
        actorId,
      },
    ],
    { session },
  );

  return part;
}

/**
 * Reconciles recorded stock against a physical count, or writes off damaged
 * stock. Always audited: an unexplained quantity change is precisely the
 * signal an internal control review looks for.
 */
export async function adjustStock(
  { partId, newQuantity, reason, actorId, type = "adjustment" },
  session,
) {
  const part = await PartModel.findById(partId).session(session ?? null);
  if (!part) return null;

  const previous = part.stockQuantity || 0;
  const delta = newQuantity - previous;
  if (delta === 0) return part;

  part.stockQuantity = newQuantity;
  await part.save({ session });

  await InventoryTransactionModel.create(
    [
      {
        partId: part._id,
        type: delta < 0 && type === "writeOff" ? "writeOff" : "adjustment",
        quantity: Math.abs(delta),
        unitCost: part.costPrice || 0,
        balanceAfter: part.stockQuantity,
        reason,
        actorId,
      },
    ],
    { session },
  );

  await logAudit({
    action: "stockAdjusted",
    actorId,
    targetModel: "Part",
    targetId: part._id,
    details: `${part.sku}: ${previous} → ${newQuantity} (${delta > 0 ? "+" : ""}${delta}) — ${reason || "no reason given"}`,
  });

  return part;
}
