import * as serviceService from "../services/service.service.js";

// ============= SERVICE CATEGORY CONTROLLERS =============

/**
 * POST /api/services/categories/:id/photo
 * Uploads a category image to Cloudinary (see routes/service.routes.js for
 * the multer memory-storage setup) and stores the resulting HTTPS URL.
 */
export async function uploadServiceCategoryPhoto(req, res) {
  const category = await serviceService.uploadServiceCategoryPhoto(req.params.id, req.file);
  res.json(category);
}

/** GET /api/services/categories — fetch all service categories. */
export async function getAllServiceCategories(req, res) {
  const categories = await serviceService.getAllServiceCategories();
  res.json(categories);
}

/** GET /api/services/categories/:id — fetch a single service category by ID. */
export async function getServiceCategoryById(req, res) {
  const category = await serviceService.getServiceCategoryById(req.params.id);
  res.json(category);
}

/** POST /api/services/categories — create a new service category (Admin only). */
export async function createServiceCategory(req, res) {
  const category = await serviceService.createServiceCategory(req.body ?? {});
  res.status(201).json(category);
}

/** PUT /api/services/categories/:id — update a service category (Admin only). */
export async function updateServiceCategory(req, res) {
  const category = await serviceService.updateServiceCategory(req.params.id, req.body ?? {});
  res.json(category);
}

/** DELETE /api/services/categories/:id — delete a service category (Admin only). */
export async function deleteServiceCategory(req, res) {
  const result = await serviceService.deleteServiceCategory(req.params.id);
  res.json(result);
}

// ============= SERVICE CONTROLLERS =============

/** GET /api/services — fetch all services with optional filtering. */
export async function getAllServices(req, res) {
  const services = await serviceService.getAllServices(req.query ?? {});
  res.json(services);
}

/** GET /api/services/:id — fetch a single service by ID. */
export async function getServiceById(req, res) {
  const service = await serviceService.getServiceById(req.params.id);
  res.json(service);
}

/** POST /api/services — create a new service (Admin only). */
export async function createService(req, res) {
  const service = await serviceService.createService(req.body ?? {});
  res.status(201).json(service);
}

/** PUT /api/services/:id — update a service (Admin only). */
export async function updateService(req, res) {
  const service = await serviceService.updateService(req.params.id, req.body ?? {});
  res.json(service);
}

/** DELETE /api/services/:id — delete a service (Admin only). */
export async function deleteService(req, res) {
  const result = await serviceService.deleteService(req.params.id);
  res.json(result);
}
