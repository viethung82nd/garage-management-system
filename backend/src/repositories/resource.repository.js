import { ResourceModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const resourceRepository = createRepository(ResourceModel);
