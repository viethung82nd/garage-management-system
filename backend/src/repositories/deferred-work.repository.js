import { DeferredWorkModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const deferredWorkRepository = createRepository(DeferredWorkModel);
