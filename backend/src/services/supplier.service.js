import { supplierRepository } from "../repositories/supplier.repository.js";
import { ApiError } from "../utils/apiError.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;

/**
 * Suppliers are the counterparties on every purchase order — the vendor
 * catalog purchasing and payables both read from. CRUD here is deliberately
 * simple (this is a contact + terms record, not a pricing engine); the
 * interesting behaviour — receiving goods, ageing payables — lives in
 * purchase-order.service.js and reads a supplier's `paymentTermDays` off
 * what's created here.
 */
export async function listSuppliers({ isActive, q } = {}) {
  const filter = {};

  // Default to active-only (what a picker wants); pass isActive=all to see
  // retired vendors too, or isActive=false to see only retired ones.
  if (isActive === undefined) {
    filter.isActive = true;
  } else if (isActive !== "all") {
    filter.isActive = isActive === true || isActive === "true";
  }

  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "i");
    filter.$or = [{ name: pattern }, { code: pattern }];
  }

  return supplierRepository.model.find(filter).sort({ name: 1 });
}

export async function getSupplierById(id) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid supplier ID format");
  }

  const supplier = await supplierRepository.findById(id);
  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }
  return supplier;
}

function validateTermFields({ paymentTermDays, leadTimeDays }) {
  if (
    paymentTermDays !== undefined &&
    paymentTermDays !== null &&
    (typeof paymentTermDays !== "number" || paymentTermDays < 0)
  ) {
    throw new ApiError(400, "paymentTermDays must be a non-negative number");
  }
  if (
    leadTimeDays !== undefined &&
    leadTimeDays !== null &&
    (typeof leadTimeDays !== "number" || leadTimeDays < 0)
  ) {
    throw new ApiError(400, "leadTimeDays must be a non-negative number");
  }
}

export async function createSupplier({
  name,
  code,
  contactName,
  phone,
  email,
  address,
  taxCode,
  paymentTermDays,
  leadTimeDays,
  notes,
}) {
  if (!name || !name.trim()) {
    throw new ApiError(400, "Supplier name is required");
  }
  if (!code || !code.trim()) {
    throw new ApiError(400, "Supplier code is required");
  }
  validateTermFields({ paymentTermDays, leadTimeDays });

  try {
    return await supplierRepository.create({
      name: name.trim(),
      code: code.trim(),
      contactName: contactName?.trim() || undefined,
      phone: phone?.trim() || undefined,
      email: email?.trim() || undefined,
      address: address?.trim() || undefined,
      taxCode: taxCode?.trim() || undefined,
      paymentTermDays,
      leadTimeDays,
      notes: notes?.trim() || undefined,
    });
  } catch (err) {
    if (err?.code === 11000) {
      throw new ApiError(409, `A supplier with code "${code.trim()}" already exists`);
    }
    throw err;
  }
}

export async function updateSupplier(id, updates) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid supplier ID format");
  }

  const supplier = await supplierRepository.findById(id);
  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }

  const {
    name,
    code,
    contactName,
    phone,
    email,
    address,
    taxCode,
    paymentTermDays,
    leadTimeDays,
    notes,
    isActive,
  } = updates;

  if (name !== undefined) {
    if (!name.trim()) {
      throw new ApiError(400, "Supplier name is required");
    }
    supplier.name = name.trim();
  }
  if (code !== undefined) {
    if (!code.trim()) {
      throw new ApiError(400, "Supplier code is required");
    }
    supplier.code = code.trim();
  }
  validateTermFields({ paymentTermDays, leadTimeDays });
  if (paymentTermDays !== undefined) supplier.paymentTermDays = paymentTermDays;
  if (leadTimeDays !== undefined) supplier.leadTimeDays = leadTimeDays;
  if (contactName !== undefined) supplier.contactName = contactName?.trim() || undefined;
  if (phone !== undefined) supplier.phone = phone?.trim() || undefined;
  if (email !== undefined) supplier.email = email?.trim() || undefined;
  if (address !== undefined) supplier.address = address?.trim() || undefined;
  if (taxCode !== undefined) supplier.taxCode = taxCode?.trim() || undefined;
  if (notes !== undefined) supplier.notes = notes?.trim() || undefined;
  if (isActive !== undefined) supplier.isActive = Boolean(isActive);

  try {
    await supplier.save();
  } catch (err) {
    if (err?.code === 11000) {
      throw new ApiError(409, `A supplier with code "${code?.trim()}" already exists`);
    }
    throw err;
  }

  return supplier;
}

/** Soft delete — a supplier is permanently referenced by every purchase order
 *  ever raised against it, so it is retired rather than removed. */
export async function deleteSupplier(id) {
  if (!OID_RE.test(id)) {
    throw new ApiError(400, "Invalid supplier ID format");
  }

  const supplier = await supplierRepository.findById(id);
  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }

  supplier.isActive = false;
  await supplier.save();

  return { message: "Supplier deactivated" };
}
