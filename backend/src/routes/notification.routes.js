import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
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
notificationRouter.get("/", requireAuth, asyncHandler(listNotifications));
notificationRouter.get("/unread-count", requireAuth, asyncHandler(unreadCount));
notificationRouter.patch("/read-all", requireAuth, asyncHandler(markAllRead));
notificationRouter.patch("/:id/read", requireAuth, asyncHandler(markRead));
// Static "/read" path must be registered before the "/:id" wildcard below.
notificationRouter.delete("/read", requireAuth, asyncHandler(clearReadNotifications));
notificationRouter.delete("/:id", requireAuth, asyncHandler(deleteNotification));
