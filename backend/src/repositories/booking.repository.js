import { BookingModel, BookingHistoryModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const bookingRepository = createRepository(BookingModel);
export const bookingHistoryRepository = createRepository(BookingHistoryModel);
