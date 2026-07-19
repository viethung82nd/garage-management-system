import { NotificationModel } from "../models/index.js";
import { HttpError } from "../middleware/error.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;

/**
 * GET /api/notifications — the authenticated user's notifications, newest first.
 * Query: isRead ("true"/"false"), limit (default 50, max 100)
 */
export async function listNotifications(req, res) {
  const { isRead, limit } = req.query;
  const filter = { userId: req.user.sub };
  if (isRead !== undefined) {
    filter.isRead = isRead === "true";
  }
  const lim = Math.min(Number(limit) || 50, 100);

  const notifications = await NotificationModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(lim);

  res.json({ notifications });
}

/** GET /api/notifications/unread-count — number of unread notifications. */
export async function unreadCount(req, res) {
  const count = await NotificationModel.countDocuments({
    userId: req.user.sub,
    isRead: false,
  });
  res.json({ count });
}

/** PATCH /api/notifications/:id/read — mark one of the user's notifications read. */
export async function markRead(req, res) {
  if (!OID_RE.test(String(req.params.id))) {
    throw new HttpError(400, "Invalid notification ID format");
  }
  // Scope by userId so a user can never touch another user's notification.
  const notification = await NotificationModel.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.sub },
    { isRead: true },
    { new: true }
  );
  if (!notification) {
    throw new HttpError(404, "Notification not found");
  }
  res.json({ notification });
}

/** PATCH /api/notifications/read-all — mark all of the user's notifications read. */
export async function markAllRead(req, res) {
  const result = await NotificationModel.updateMany(
    { userId: req.user.sub, isRead: false },
    { isRead: true }
  );
  res.json({ updated: result.modifiedCount });
}

/** DELETE /api/notifications/read — remove all of the user's already-read notifications. */
export async function clearReadNotifications(req, res) {
  const result = await NotificationModel.deleteMany({
    userId: req.user.sub,
    isRead: true,
  });
  res.json({ deleted: result.deletedCount });
}

/** DELETE /api/notifications/:id — remove one of the user's notifications. */
export async function deleteNotification(req, res) {
  if (!OID_RE.test(String(req.params.id))) {
    throw new HttpError(400, "Invalid notification ID format");
  }
  // Scope by userId so a user can never touch another user's notification.
  const notification = await NotificationModel.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.sub,
  });
  if (!notification) {
    throw new HttpError(404, "Notification not found");
  }
  res.json({ notification });
}
