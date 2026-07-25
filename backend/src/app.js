import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { dbStatus } from "./config/db.js";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";
import { requestLogger } from "./middlewares/logger.middleware.js";
import { createApiRouter } from "./routes/index.js";

// Rate limiting is skipped under the automated test suite: vitest drives many
// dozens of requests against a single in-process app instance across a test
// file's cases, and a window meant to stop real-world abuse would otherwise
// make the suite itself flaky (or force artificially high limits that
// wouldn't actually protect anything in production).
const isTestEnv = env.nodeEnv === "test";

/** General-purpose ceiling for every API route — generous enough not to bother
 *  a normal user, tight enough to blunt naive scripted abuse. */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
});

/** Stricter limiter for the two unauthenticated, row-creating surfaces
 *  (registration/login/forgot-password and public booking submission) — the
 *  routes most attractive to credential stuffing / spam without any auth
 *  gate in front of them. */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
});

/** Builds the Express application (no listening — see server.js). */
export function createApp() {
  const app = express();

  app.use(requestLogger);
  // helmet sets a battery of hardening headers (CSP, HSTS, no-sniff, frame
  // options, etc.) — cheap, no-config protection that belongs ahead of
  // everything else in the chain.
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  // Vehicle reception embeds walk-around photos + the signature pad as
  // base64 data URLs directly in the JSON body rather than multipart —
  // express's 100kb default limit rejects almost any real phone photo
  // outright. Raised to fit a handful of photos plus a signature.
  app.use(express.json({ limit: "20mb" }));
  app.use(generalLimiter);
  app.use("/api/auth", strictLimiter);
  app.use("/api/bookings", strictLimiter);

  // Health check: verifies the server is up and reports DB connectivity.
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", db: dbStatus() });
  });

  app.use("/api", createApiRouter());

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
