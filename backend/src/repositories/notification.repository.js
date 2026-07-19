import { NotificationModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const notificationRepository = createRepository(NotificationModel);
