import { ServiceRequestModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const serviceRequestRepository = createRepository(ServiceRequestModel);
