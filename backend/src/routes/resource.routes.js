import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  listResources,
  createResource,
  updateResource,
  deleteResource,
} from "../controllers/resource.controller.js";

export const resourceRouter = Router();

// Read: staff who need to know what's available (advisors booking/assigning
// work) as well as admins managing the directory.
resourceRouter.get(
  "",
  requireAuth,
  requireRole("admin", "serviceAdvisor"),
  catchAsync(listResources),
);
resourceRouter.post("", requireAuth, requireRole("admin"), catchAsync(createResource));
resourceRouter.put("/:id", requireAuth, requireRole("admin"), catchAsync(updateResource));
resourceRouter.delete("/:id", requireAuth, requireRole("admin"), catchAsync(deleteResource));
