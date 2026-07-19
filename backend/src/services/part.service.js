import { partRepository } from "../repositories/part.repository.js";
import { ApiError } from "../utils/apiError.js";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export async function getAllParts({ q } = {}) {
  const filter = {};
  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "i");
    filter.$or = [{ name: pattern }, { sku: pattern }];
  }

  return partRepository.model.find(filter).sort({ createdAt: -1 });
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

export async function createPart({ name, sku, unitPrice, stockQuantity }) {
  if (!name || !name.trim()) {
    throw new ApiError(400, "Part name is required");
  }
  if (!sku || !sku.trim()) {
    throw new ApiError(400, "SKU is required");
  }
  if (typeof unitPrice !== "number" || unitPrice < 0) {
    throw new ApiError(400, "Unit price must be a non-negative number");
  }
  if (typeof stockQuantity !== "number" || stockQuantity < 0) {
    throw new ApiError(400, "Stock quantity must be a non-negative number");
  }

  try {
    return await partRepository.create({
      name: name.trim(),
      sku: sku.trim(),
      unitPrice,
      stockQuantity,
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw new ApiError(409, `A part with SKU "${sku.trim()}" already exists`);
    }
    throw err;
  }
}

export async function updatePart(id, { name, sku, unitPrice, stockQuantity }) {
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
    if (typeof unitPrice !== "number" || unitPrice < 0) {
      throw new ApiError(400, "Unit price must be a non-negative number");
    }
    part.unitPrice = unitPrice;
  }
  if (stockQuantity !== undefined) {
    if (typeof stockQuantity !== "number" || stockQuantity < 0) {
      throw new ApiError(400, "Stock quantity must be a non-negative number");
    }
    part.stockQuantity = stockQuantity;
  }

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

export async function deletePart(id) {
  if (!id.match(OBJECT_ID_RE)) {
    throw new ApiError(400, "Invalid part ID format");
  }

  const part = await partRepository.model.findByIdAndDelete(id);
  if (!part) {
    throw new ApiError(404, "Part not found");
  }

  return { message: "Part removed" };
}
