import { notificationRepository } from "../repositories/notification.repository.js";
import { ApiError } from "../utils/apiError.js";

const OID_RE = /^[0-9a-fA-F]{24}$/;

/** The authenticated user's notifications, newest first. */
export async function listNotifications(userId, { isRead, limit }) {
  const filter = { userId };
  if (isRead !== undefined) {
    filter.isRead = isRead === "true";
  }
  const lim = Math.min(Number(limit) || 50, 100);

  const notifications = await notificationRepository.model
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(lim);

  return { notifications };
}

/** Number of unread notifications. */
export async function unreadCount(userId) {
  const count = await notificationRepository.countDocuments({ userId, isRead: false });
  return { count };
}

/** Mark one of the user's notifications read. Scoped by userId. */
export async function markRead(id, userId) {
  if (!OID_RE.test(String(id))) {
    throw new ApiError(400, "Invalid notification ID format");
  }
  const notification = await notificationRepository.model.findOneAndUpdate(
    { _id: id, userId },
    { isRead: true },
    { new: true },
  );
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }
  return { notification };
}

/** Mark all of the user's notifications read. */
export async function markAllRead(userId) {
  const result = await notificationRepository.model.updateMany(
    { userId, isRead: false },
    { isRead: true },
  );
  return { updated: result.modifiedCount };
}

/** Remove all of the user's already-read notifications. */
export async function clearReadNotifications(userId) {
  const result = await notificationRepository.model.deleteMany({ userId, isRead: true });
  return { deleted: result.deletedCount };
}

/** Remove one of the user's notifications. Scoped by userId. */
export async function deleteNotification(id, userId) {
  if (!OID_RE.test(String(id))) {
    throw new ApiError(400, "Invalid notification ID format");
  }
  const notification = await notificationRepository.model.findOneAndDelete({
    _id: id,
    userId,
  });
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }
  return { notification };
}
