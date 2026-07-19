import { VehicleModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const vehicleRepository = createRepository(VehicleModel);
