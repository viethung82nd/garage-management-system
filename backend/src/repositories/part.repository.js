import { PartModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const partRepository = createRepository(PartModel);
