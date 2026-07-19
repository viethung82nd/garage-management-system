import { ServiceModel, ServiceCategoryModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const serviceRepository = createRepository(ServiceModel);
export const serviceCategoryRepository = createRepository(ServiceCategoryModel);
