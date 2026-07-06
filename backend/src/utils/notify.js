import { NotificationModel, UserModel } from "../models/index.js";

/**
 * Persists a single in-app notification. Best-effort: a notification failure
 * must never break the business action that triggered it, so errors are logged
 * and swallowed rather than propagated.
 *
 * @param {{ userId: any, type: string, title: string, message?: string,
 *           refId?: any, refModel?: "Booking" | "RepairOrder" }} payload
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  refId,
  refModel,
}) {
  if (!userId) return null;
  try {
    return await NotificationModel.create({
      userId,
      type,
      title,
      message,
      refId,
      refModel,
    });
  } catch (err) {
    console.warn("[notify] failed to create notification:", err?.message ?? err);
    return null;
  }
}

/**
 * Fans a notification out to every active user holding a role — e.g. alerting
 * all service advisors that a new booking needs confirmation. Best-effort, same
 * as createNotification.
 */
export async function notifyRole(role, payload) {
  try {
    const users = await UserModel.find(
      { role, isActive: true },
      { _id: 1 }
    ).lean();
    if (!users.length) return [];
    return await NotificationModel.insertMany(
      users.map((u) => ({ userId: u._id, ...payload }))
    );
  } catch (err) {
    console.warn("[notify] failed to notify role:", err?.message ?? err);
    return [];
  }
}
