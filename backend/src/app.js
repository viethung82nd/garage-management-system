import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { dbStatus } from "./db/connect.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { requestLogger } from "./middleware/logger.js";
import { authRouter } from "./routes/auth.routes.js";
import { serviceRouter } from "./routes/service.routes.js";
import { repairOrderRouter } from "./routes/repair-order.routes.js";
import { bookingRouter } from "./routes/booking.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { paymentRouter } from "./routes/payment.routes.js";

/** Builds the Express application (no listening — see server.js). */
export function createApp() {
  const app = express();

  app.use(requestLogger);
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  // Health check: verifies the server is up and reports DB connectivity.
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", db: dbStatus() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/admin/services", serviceRouter);
  app.use("/api/repair-orders", repairOrderRouter);
  app.use("/api/bookings", bookingRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/payments", paymentRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
