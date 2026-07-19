import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { bookingRouter } from "./booking.routes.js";
import { adminRouter } from "./admin.routes.js";
import { paymentRouter } from "./payment.routes.js";
import { serviceRouter } from "./service.routes.js";
import { repairOrderRouter } from "./repair-order.routes.js";
import { trackingRouter } from "./tracking.routes.js";
import { invoiceRouter } from "./invoice.routes.js";
import { reviewRouter } from "./review.routes.js";
import { notificationRouter } from "./notification.routes.js";
import { inspectionReportRouter } from "./inspection-report.routes.js";
import { transferRequestRouter } from "./transfer-request.routes.js";
import { scheduleRouter } from "./schedule.routes.js";
import { vehicleRouter } from "./vehicle.routes.js";
import { advisorRouter } from "./advisor.routes.js";
import { receptionRouter } from "./reception.routes.js";
import { quotationRouter } from "./quotation.routes.js";
import { additionalServiceRouter } from "./additional-service.routes.js";

/** Mounts every domain router under its API path. Gathered here so app.js
 *  only needs to know about one router. */
export function createApiRouter() {
  const router = Router();

  router.use("/auth", authRouter);
  router.use("/bookings", bookingRouter);
  router.use("/admin", adminRouter);
  router.use("/payments", paymentRouter);
  router.use("/services", serviceRouter);
  router.use("/admin/services", serviceRouter);
  router.use("/repair-orders", repairOrderRouter);
  router.use("/inspection-reports", inspectionReportRouter);
  router.use("/transfer-requests", transferRequestRouter);
  router.use("/schedules", scheduleRouter);
  router.use("/tracking", trackingRouter);
  router.use("/invoices", invoiceRouter);
  router.use("/reviews", reviewRouter);
  router.use("/notifications", notificationRouter);
  router.use("/vehicles", vehicleRouter);
  router.use("/advisor", advisorRouter);
  router.use("/receptions", receptionRouter);
  router.use("/quotations", quotationRouter);
  router.use("/additional-service-proposals", additionalServiceRouter);

  return router;
}
