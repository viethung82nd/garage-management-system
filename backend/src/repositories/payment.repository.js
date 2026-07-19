import { PaymentModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const paymentRepository = createRepository(PaymentModel);
