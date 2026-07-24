import { QuoteVersionModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const quoteVersionRepository = createRepository(QuoteVersionModel);
