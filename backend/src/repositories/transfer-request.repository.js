import { TransferRequestModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const transferRequestRepository = createRepository(TransferRequestModel);
