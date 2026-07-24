import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import { listDeferredWork, resolveDeferredWork } from "../controllers/deferred-work.controller.js";

export const deferredWorkRouter = Router();

deferredWorkRouter.get(
  "",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(listDeferredWork),
);

deferredWorkRouter.patch(
  "/:id",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(resolveDeferredWork),
);
