import { ReviewModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const reviewRepository = createRepository(ReviewModel);
