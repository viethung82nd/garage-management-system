import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { dbStatus } from "./db/connect.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { authRouter } from "./routes/auth.routes.js";
import { serviceRouter } from "./routes/service.routes.js";
import { repairOrderRouter } from "./routes/repair-order.routes.js";

/** Builds the Express application (no listening — see server.js). */
export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  // Health check: verifies the server is up and reports DB connectivity.
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", db: dbStatus() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/admin/services", serviceRouter);
  app.use("/api/repair-orders", repairOrderRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
