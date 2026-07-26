import { partRepository } from "../repositories/part.repository.js";
import { InventoryTransactionModel, PART_CONDITIONS } from "../models/index.js";
import { ApiError } from "../utils/apiError.js";
import { adjustStock, availableOf } from "../utils/stock.js";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export async function getAllParts({ q, includeInactive, lowStock } = {}) {
  const filter = {};
  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "i");
    filter.$or = [{ name: pattern }, { sku: pattern }, { oemCode: pattern }];
  }
  // Retired parts stay in the catalogue for historical documents but are hidden
  // from day-to-day lookups unless explicitly asked for.
  if (includeInactive !== "true" && includeInactive !== true) {
    filter.isActive = { $ne: false };
  }

  const parts = await partRepository.model.find(filter).sort({ createdAt: -1 });

  if (lowStock === "true" || lowStock === true) {
    return parts.filter((part) => availableOf(part) <= (part.reorderPoint || 0));
  }
  return parts;
}

export async function getPartById(id) {
  if (!id.match(OBJECT_ID_RE)) {
    throw new ApiError(400, "Invalid part ID format");
  }

  const part = await partRepository.findById(id);
  if (!part) {
    throw new ApiError(404, "Part not found");
  }
  return part;
}

function validateMoney(value, label) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    throw new ApiError(400, `${label} must be a non-negative number`);
  }
}

export async function createPart({
  name,
  sku,
  oemCode,
  unit,
  category,
  condition,
  unitPrice,
  costPrice,
  stockQuantity,
  minStock,
  maxStock,
  reorderPoint,
  location,
  supplierId,
}) {
  if (!name || !name.trim()) {
    throw new ApiError(400, "Part name is required");
  }
  if (!sku || !sku.trim()) {
    throw new ApiError(400, "SKU is required");
  }
  validateMoney(unitPrice, "Unit price");
  if (typeof stockQuantity !== "number" || stockQuantity < 0) {
    throw new ApiError(400, "Stock quantity must be a non-negative number");
  }
  if (costPrice !== undefined) validateMoney(costPrice, "Cost price");
  if (condition !== undefined && !PART_CONDITIONS.includes(condition)) {
    throw new ApiError(400, `condition must be one of: ${PART_CONDITIONS.join(", ")}`);
  }

  try {
    return await partRepository.create({
      name: name.trim(),
      sku: sku.trim(),
      oemCode: oemCode?.trim() || undefined,
      unit: unit?.trim() || undefined,
      category: category?.trim() || undefined,
      condition,
      unitPrice,
      costPrice: costPrice ?? 0,
      stockQuantity,
      minStock,
      maxStock,
      reorderPoint,
      location: location?.trim() || undefined,
      supplierId: supplierId || undefined,
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw new ApiError(409, `A part with SKU "${sku.trim()}" already exists`);
    }
    throw err;
  }
}

/**
 * Edits a part's catalogue details.
 *
 * Deliberately does NOT accept `stockQuantity`. Stock is the balance of a
 * ledger, not a free-form field: letting it be typed over is how shrinkage
 * becomes invisible and cost of goods sold stops reconciling. Corrections go
 * through adjustPartStock, which demands a reason and writes an audit entry.
 */
export async function updatePart(
  id,
  {
    name,
    sku,
    oemCode,
    unit,
    category,
    condition,
    unitPrice,
    costPrice,
    minStock,
    maxStock,
    reorderPoint,
    location,
    supplierId,
    isActive,
  },
) {
  if (!id.match(OBJECT_ID_RE)) {
    throw new ApiError(400, "Invalid part ID format");
  }

  const part = await partRepository.findById(id);
  if (!part) {
    throw new ApiError(404, "Part not found");
  }

  if (name !== undefined) {
    if (!name.trim()) {
      throw new ApiError(400, "Part name is required");
    }
    part.name = name.trim();
  }
  if (sku !== undefined) {
    if (!sku.trim()) {
      throw new ApiError(400, "SKU is required");
    }
    part.sku = sku.trim();
  }
  if (unitPrice !== undefined) {
    validateMoney(unitPrice, "Unit price");
    part.unitPrice = unitPrice;
  }
  if (costPrice !== undefined) {
    validateMoney(costPrice, "Cost price");
    part.costPrice = costPrice;
  }
  if (condition !== undefined) {
    if (!PART_CONDITIONS.includes(condition)) {
      throw new ApiError(400, `condition must be one of: ${PART_CONDITIONS.join(", ")}`);
    }
    part.condition = condition;
  }
  if (oemCode !== undefined) part.oemCode = oemCode?.trim() || undefined;
  if (unit !== undefined) part.unit = unit?.trim() || undefined;
  if (category !== undefined) part.category = category?.trim() || undefined;
  if (minStock !== undefined) part.minStock = minStock;
  if (maxStock !== undefined) part.maxStock = maxStock;
  if (reorderPoint !== undefined) part.reorderPoint = reorderPoint;
  if (location !== undefined) part.location = location?.trim() || undefined;
  if (supplierId !== undefined) part.supplierId = supplierId || undefined;
  if (isActive !== undefined) part.isActive = Boolean(isActive);

  try {
    await part.save();
  } catch (err) {
    if (err?.code === 11000) {
      throw new ApiError(409, `A part with SKU "${sku?.trim()}" already exists`);
    }
    throw err;
  }

  return part;
}

/**
 * Corrects on-hand stock after a physical count, or writes it off.
 * A reason is mandatory — an unexplained quantity change is exactly the signal
 * an internal-control review exists to catch.
 */
export async function adjustPartStock(id, { newQuantity, reason, type }, actorId) {
  if (!id.match(OBJECT_ID_RE)) {
    throw new ApiError(400, "Invalid part ID format");
  }
  if (typeof newQuantity !== "number" || Number.isNaN(newQuantity) || newQuantity < 0) {
    throw new ApiError(400, "newQuantity must be a non-negative number");
  }
  if (!reason || !reason.trim()) {
    throw new ApiError(400, "A reason is required when adjusting stock");
  }

  const part = await adjustStock(
    { partId: id, newQuantity, reason: reason.trim(), actorId, type },
    undefined,
  );
  if (!part) {
    throw new ApiError(404, "Part not found");
  }
  return part;
}

/** The movement history behind a part's current balance. */
export async function getPartTransactions(id, { limit = 50 } = {}) {
  if (!id.match(OBJECT_ID_RE)) {
    throw new ApiError(400, "Invalid part ID format");
  }

  const transactions = await InventoryTransactionModel.find({ partId: id })
    .populate("actorId", "fullName role")
    .populate("repairOrderId", "code")
    .populate("purchaseOrderId", "code")
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 50, 200));

  return { transactions };
}

/**
 * Retires a part. Soft delete: historical quote, order and invoice lines still
 * reference it, and removing the row would orphan them.
 */
export async function deletePart(id) {
  if (!id.match(OBJECT_ID_RE)) {
    throw new ApiError(400, "Invalid part ID format");
  }

  const part = await partRepository.findById(id);
  if (!part) {
    throw new ApiError(404, "Part not found");
  }
  if (!part.isActive) {
    return { message: "Part already retired" };
  }

  part.isActive = false;
  await part.save();

  return { message: "Part retired" };
}
