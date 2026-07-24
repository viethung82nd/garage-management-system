import { ReminderModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const reminderRepository = createRepository(ReminderModel);
