import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
  clearReadNotifications,
  deleteNotification,
} from "../controllers/notification.controller.js";

export const notificationRouter = Router();

// All notification routes act on the authenticated user's own notifications.
notificationRouter.get("/", requireAuth, catchAsync(listNotifications));
notificationRouter.get("/unread-count", requireAuth, catchAsync(unreadCount));
notificationRouter.patch("/read-all", requireAuth, catchAsync(markAllRead));
notificationRouter.patch("/:id/read", requireAuth, catchAsync(markRead));
// Static "/read" path must be registered before the "/:id" wildcard below.
notificationRouter.delete("/read", requireAuth, catchAsync(clearReadNotifications));
notificationRouter.delete("/:id", requireAuth, catchAsync(deleteNotification));
