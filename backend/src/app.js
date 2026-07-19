import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { dbStatus } from "./config/db.js";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";
import { requestLogger } from "./middlewares/logger.middleware.js";
import { createApiRouter } from "./routes/index.js";

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

  app.use("/api", createApiRouter());

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
