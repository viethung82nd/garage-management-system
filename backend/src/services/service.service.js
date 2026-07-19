import { serviceRepository, serviceCategoryRepository } from "../repositories/service.repository.js";
import { ApiError } from "../utils/apiError.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

// ============= SERVICE CATEGORY =============

export async function uploadServiceCategoryPhoto(id, file) {
  if (!id.match(OBJECT_ID_RE)) {
    throw new ApiError(400, "Invalid category ID format");
  }
  if (!file) {
    throw new ApiError(400, "photo file is required");
  }

  const category = await serviceCategoryRepository.findById(id);
  if (!category) {
    throw new ApiError(404, "Service category not found");
  }

  const uploaded = await uploadBufferToCloudinary(file.buffer, "category-photos");
  category.imageUrl = uploaded.secure_url;
  await category.save();

  return category;
}

export async function getAllServiceCategories() {
  return serviceCategoryRepository.model.find().select("-__v").sort({ createdAt: -1 });
}

export async function getServiceCategoryById(id) {
  if (!id.match(OBJECT_ID_RE)) {
    throw new ApiError(400, "Invalid category ID format");
  }

  const category = await serviceCategoryRepository.model.findById(id).select("-__v");
  if (!category) {
    throw new ApiError(404, "Service category not found");
  }
  return category;
}

export async function createServiceCategory({ name, description, isActive, imageUrl }) {
  if (!name || !name.trim()) {
    throw new ApiError(400, "Category name is required");
  }

  const existing = await serviceCategoryRepository.findOne({
    name: { $regex: `^${name.trim()}$`, $options: "i" },
  });
  if (existing) {
    throw new ApiError(409, "Category name already exists");
  }

  return serviceCategoryRepository.create({
    name: name.trim(),
    description: description?.trim() || "",
    isActive: isActive ?? true,
    imageUrl: imageUrl?.trim() || undefined,
  });
}

export async function updateServiceCategory(id, { name, description, isActive, imageUrl }) {
  if (!id.match(OBJECT_ID_RE)) {
    throw new ApiError(400, "Invalid category ID format");
  }

  const category = await serviceCategoryRepository.findById(id);
  if (!category) {
    throw new ApiError(404, "Service category not found");
  }

  if (name && name.trim()) {
    const existing = await serviceCategoryRepository.findOne({
      _id: { $ne: id },
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (existing) {
      throw new ApiError(409, "Category name already exists");
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
  return category;
}

export async function deleteServiceCategory(id) {
  if (!id.match(OBJECT_ID_RE)) {
    throw new ApiError(400, "Invalid category ID format");
  }

  const category = await serviceCategoryRepository.deleteById(id);
  if (!category) {
    throw new ApiError(404, "Service category not found");
  }

  return { message: "Service category deleted successfully" };
}

// ============= SERVICE =============

export async function getAllServices({ category, isActive }) {
  const filter = {};
  if (category) filter.category = category;
  if (isActive !== undefined) filter.isActive = isActive === "true";

  return serviceRepository.model.find(filter).select("-__v").sort({ createdAt: -1 });
}

export async function getServiceById(id) {
  if (!id.match(OBJECT_ID_RE)) {
    throw new ApiError(400, "Invalid service ID format");
  }

  const service = await serviceRepository.model.findById(id).select("-__v");
  if (!service) {
    throw new ApiError(404, "Service not found");
  }
  return service;
}

export async function createService({ name, category, basePrice, estimatedDuration, isActive }) {
  if (!name || !name.trim()) {
    throw new ApiError(400, "Service name is required");
  }

  if (basePrice === undefined || basePrice === null) {
    throw new ApiError(400, "Base price is required");
  }

  if (typeof basePrice !== "number" || basePrice < 0) {
    throw new ApiError(400, "Base price must be a non-negative number");
  }

  if (category && category.trim()) {
    const categoryExists = await serviceCategoryRepository.findOne({ name: category.trim() });
    if (!categoryExists) {
      throw new ApiError(400, `Service category "${category}" does not exist`);
    }
  }

  return serviceRepository.create({
    name: name.trim(),
    category: category?.trim() || "",
    basePrice,
    estimatedDuration: estimatedDuration || 0,
    isActive: isActive ?? true,
  });
}

export async function updateService(id, { name, category, basePrice, estimatedDuration, isActive }) {
  if (!id.match(OBJECT_ID_RE)) {
    throw new ApiError(400, "Invalid service ID format");
  }

  const service = await serviceRepository.findById(id);
  if (!service) {
    throw new ApiError(404, "Service not found");
  }

  if (name && name.trim()) {
    service.name = name.trim();
  }

  if (category !== undefined) {
    if (category && category.trim()) {
      const categoryExists = await serviceCategoryRepository.findOne({ name: category.trim() });
      if (!categoryExists) {
        throw new ApiError(400, `Service category "${category}" does not exist`);
      }
      service.category = category.trim();
    } else {
      service.category = "";
    }
  }

  if (basePrice !== undefined && basePrice !== null) {
    if (typeof basePrice !== "number" || basePrice < 0) {
      throw new ApiError(400, "Base price must be a non-negative number");
    }
    service.basePrice = basePrice;
  }

  if (estimatedDuration !== undefined && estimatedDuration !== null) {
    if (typeof estimatedDuration !== "number" || estimatedDuration < 0) {
      throw new ApiError(400, "Estimated duration must be a non-negative number");
    }
    service.estimatedDuration = estimatedDuration;
  }

  if (isActive !== undefined) {
    service.isActive = isActive;
  }

  await service.save();
  return service;
}

export async function deleteService(id) {
  if (!id.match(OBJECT_ID_RE)) {
    throw new ApiError(400, "Invalid service ID format");
  }

  const service = await serviceRepository.deleteById(id);
  if (!service) {
    throw new ApiError(404, "Service not found");
  }

  return { message: "Service deleted successfully" };
}
