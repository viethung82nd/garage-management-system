import { ServiceModel, ServiceCategoryModel } from "../models/index.js";
import { HttpError } from "../middleware/error.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

/**
 * POST /api/services/categories/:id/photo
 * Uploads a category image to Cloudinary (see routes/service.routes.js for
 * the multer memory-storage setup) and stores the resulting HTTPS URL.
 */
export async function uploadServiceCategoryPhoto(req, res) {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid category ID format");
  }
  if (!req.file) {
    throw new HttpError(400, "photo file is required");
  }

  const category = await ServiceCategoryModel.findById(id);
  if (!category) {
    throw new HttpError(404, "Service category not found");
  }

  const uploaded = await uploadBufferToCloudinary(req.file.buffer, "category-photos");
  category.imageUrl = uploaded.secure_url;
  await category.save();

  res.json(category);
}

// ============= SERVICE CATEGORY CONTROLLERS =============

/**
 * GET /api/services/categories
 * Fetch all service categories
 */
export async function getAllServiceCategories(req, res) {
  const categories = await ServiceCategoryModel.find()
    .select("-__v")
    .sort({ createdAt: -1 });

  res.json(categories);
}

/**
 * GET /api/services/categories/:id
 * Fetch a single service category by ID
 */
export async function getServiceCategoryById(req, res) {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid category ID format");
  }

  const category = await ServiceCategoryModel.findById(id).select("-__v");

  if (!category) {
    throw new HttpError(404, "Service category not found");
  }

  res.json(category);
}

/**
 * POST /api/services/categories
 * Create a new service category (Admin only)
 */
export async function createServiceCategory(req, res) {
  const { name, description, isActive, imageUrl } = req.body ?? {};

  if (!name || !name.trim()) {
    throw new HttpError(400, "Category name is required");
  }

  const existing = await ServiceCategoryModel.findOne({
    name: { $regex: `^${name.trim()}$`, $options: "i" },
  });
  if (existing) {
    throw new HttpError(409, "Category name already exists");
  }

  const category = await ServiceCategoryModel.create({
    name: name.trim(),
    description: description?.trim() || "",
    isActive: isActive ?? true,
    imageUrl: imageUrl?.trim() || undefined,
  });

  res.status(201).json(category);
}

/**
 * PUT /api/services/categories/:id
 * Update a service category (Admin only)
 */
export async function updateServiceCategory(req, res) {
  const { id } = req.params;
  const { name, description, isActive, imageUrl } = req.body ?? {};

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid category ID format");
  }

  const category = await ServiceCategoryModel.findById(id);
  if (!category) {
    throw new HttpError(404, "Service category not found");
  }

  if (name && name.trim()) {
    const existing = await ServiceCategoryModel.findOne({
      _id: { $ne: id },
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (existing) {
      throw new HttpError(409, "Category name already exists");
    }
    category.name = name.trim();
  }

  if (description !== undefined) {
    category.description = description?.trim() || "";
  }

  if (isActive !== undefined) {
    category.isActive = isActive;
  }

  if (imageUrl !== undefined) {
    category.imageUrl = imageUrl?.trim() || undefined;
  }

  await category.save();
  res.json(category);
}

/**
 * DELETE /api/services/categories/:id
 * Delete a service category (Admin only)
 */
export async function deleteServiceCategory(req, res) {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid category ID format");
  }

  const category = await ServiceCategoryModel.findByIdAndDelete(id);
  if (!category) {
    throw new HttpError(404, "Service category not found");
  }

  res.json({ message: "Service category deleted successfully" });
}

// ============= SERVICE CONTROLLERS =============

/**
 * GET /api/services
 * Fetch all services with optional filtering
 */
export async function getAllServices(req, res) {
  const { category, isActive } = req.query;

  const filter = {};
  if (category) filter.category = category;
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const services = await ServiceModel.find(filter)
    .select("-__v")
    .sort({ createdAt: -1 });

  res.json(services);
}

/**
 * GET /api/services/:id
 * Fetch a single service by ID
 */
export async function getServiceById(req, res) {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid service ID format");
  }

  const service = await ServiceModel.findById(id).select("-__v");

  if (!service) {
    throw new HttpError(404, "Service not found");
  }

  res.json(service);
}

/**
 * POST /api/services
 * Create a new service (Admin only)
 */
export async function createService(req, res) {
  const { name, category, basePrice, estimatedDuration, isActive } =
    req.body ?? {};

  if (!name || !name.trim()) {
    throw new HttpError(400, "Service name is required");
  }

  if (basePrice === undefined || basePrice === null) {
    throw new HttpError(400, "Base price is required");
  }

  if (typeof basePrice !== "number" || basePrice < 0) {
    throw new HttpError(400, "Base price must be a non-negative number");
  }

  if (category && category.trim()) {
    const categoryExists = await ServiceCategoryModel.findOne({
      name: category.trim(),
    });
    if (!categoryExists) {
      throw new HttpError(400, `Service category "${category}" does not exist`);
    }
  }

  const service = await ServiceModel.create({
    name: name.trim(),
    category: category?.trim() || "",
    basePrice,
    estimatedDuration: estimatedDuration || 0,
    isActive: isActive ?? true,
  });

  res.status(201).json(service);
}

/**
 * PUT /api/services/:id
 * Update a service (Admin only)
 */
export async function updateService(req, res) {
  const { id } = req.params;
  const { name, category, basePrice, estimatedDuration, isActive } =
    req.body ?? {};

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid service ID format");
  }

  const service = await ServiceModel.findById(id);
  if (!service) {
    throw new HttpError(404, "Service not found");
  }

  if (name && name.trim()) {
    service.name = name.trim();
  }

  if (category !== undefined) {
    if (category && category.trim()) {
      const categoryExists = await ServiceCategoryModel.findOne({
        name: category.trim(),
      });
      if (!categoryExists) {
        throw new HttpError(
          400,
          `Service category "${category}" does not exist`,
        );
      }
      service.category = category.trim();
    } else {
      service.category = "";
    }
  }

  if (basePrice !== undefined && basePrice !== null) {
    if (typeof basePrice !== "number" || basePrice < 0) {
      throw new HttpError(400, "Base price must be a non-negative number");
    }
    service.basePrice = basePrice;
  }

  if (estimatedDuration !== undefined && estimatedDuration !== null) {
    if (typeof estimatedDuration !== "number" || estimatedDuration < 0) {
      throw new HttpError(
        400,
        "Estimated duration must be a non-negative number",
      );
    }
    service.estimatedDuration = estimatedDuration;
  }

  if (isActive !== undefined) {
    service.isActive = isActive;
  }

  await service.save();
  res.json(service);
}

/**
 * DELETE /api/services/:id
 * Delete a service (Admin only)
 */
export async function deleteService(req, res) {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new HttpError(400, "Invalid service ID format");
  }

  const service = await ServiceModel.findByIdAndDelete(id);
  if (!service) {
    throw new HttpError(404, "Service not found");
  }

  res.json({ message: "Service deleted successfully" });
}
