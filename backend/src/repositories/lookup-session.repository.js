import { LookupSessionModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const lookupSessionRepository = createRepository(LookupSessionModel);
