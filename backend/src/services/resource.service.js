import { resourceRepository } from "../repositories/resource.repository.js";
import { RESOURCE_TYPES } from "../models/resource.model.js";
import { ApiError } from "../utils/apiError.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;

/** The bay/lift/paint-booth directory, active by default. */
export async function listResources({ type, includeInactive } = {}) {
  const filter = {};
  if (type) {
    if (!RESOURCE_TYPES.includes(type)) {
      throw new ApiError(400, `type must be one of: ${RESOURCE_TYPES.join(", ")}`);
    }
    filter.type = type;
  }
  if (includeInactive !== "true" && includeInactive !== true) {
    filter.isActive = { $ne: false };
  }
  return resourceRepository.model.find(filter).sort({ type: 1, name: 1 });
}

export async function createResource({ name, type, notes }) {
  if (!name?.trim()) {
    throw new ApiError(400, "name is required");
  }
  if (!RESOURCE_TYPES.includes(type)) {
    throw new ApiError(400, `type must be one of: ${RESOURCE_TYPES.join(", ")}`);
  }
  return resourceRepository.create({ name: name.trim(), type, notes: notes?.trim() || undefined });
}

export async function updateResource(id, { name, type, notes, isActive }) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid resource ID format");
  }
  const resource = await resourceRepository.findById(id);
  if (!resource) {
    throw new ApiError(404, "Resource not found");
  }
  if (name !== undefined) {
    if (!name.trim()) throw new ApiError(400, "name is required");
    resource.name = name.trim();
  }
  if (type !== undefined) {
    if (!RESOURCE_TYPES.includes(type)) {
      throw new ApiError(400, `type must be one of: ${RESOURCE_TYPES.join(", ")}`);
    }
    resource.type = type;
  }
  if (notes !== undefined) resource.notes = notes?.trim() || undefined;
  if (isActive !== undefined) resource.isActive = Boolean(isActive);
  await resource.save();
  return resource;
}

/** Retire a resource. Soft delete: historical bookings may still reference it. */
export async function deleteResource(id) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid resource ID format");
  }
  const resource = await resourceRepository.findById(id);
  if (!resource) {
    throw new ApiError(404, "Resource not found");
  }
  resource.isActive = false;
  await resource.save();
  return { message: "Resource retired" };
}
