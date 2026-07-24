import { FollowUpModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const followUpRepository = createRepository(FollowUpModel);
