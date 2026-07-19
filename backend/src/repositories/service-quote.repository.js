import { ServiceQuoteModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const serviceQuoteRepository = createRepository(ServiceQuoteModel);
