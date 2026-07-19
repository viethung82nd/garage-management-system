import { OtpModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const otpRepository = createRepository(OtpModel);
