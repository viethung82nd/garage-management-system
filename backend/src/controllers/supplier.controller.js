import * as supplierService from "../services/supplier.service.js";

/** GET /api/suppliers?isActive=&q= — list vendors (active-only by default). */
export async function listSuppliers(req, res) {
  const suppliers = await supplierService.listSuppliers(req.query ?? {});
  res.json({ suppliers });
}

/** GET /api/suppliers/:id */
export async function getSupplierById(req, res) {
  const supplier = await supplierService.getSupplierById(req.params.id);
  res.json({ supplier });
}

/** POST /api/suppliers */
export async function createSupplier(req, res) {
  const supplier = await supplierService.createSupplier(req.body ?? {});
  res.status(201).json({ supplier });
}

/** PUT /api/suppliers/:id */
export async function updateSupplier(req, res) {
  const supplier = await supplierService.updateSupplier(req.params.id, req.body ?? {});
  res.json({ supplier });
}

/** DELETE /api/suppliers/:id — soft delete (deactivate), never a hard delete. */
export async function deleteSupplier(req, res) {
  const result = await supplierService.deleteSupplier(req.params.id);
  res.json(result);
}
