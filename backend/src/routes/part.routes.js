import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import { getAllParts, getPartById, createPart, updatePart, deletePart } from "../controllers/part.controller.js";

export const partRouter = Router();

// Parts are managed by parts/stores staff (and admin). Reads are also open to
// service advisors, who need to look up parts while building a quote/repair
// order (wired into quoting in Phase 3).
partRouter.use(requireAuth);

partRouter.get("", requireRole("admin", "partsStaff", "serviceAdvisor"), catchAsync(getAllParts));
partRouter.get("/:id", requireRole("admin", "partsStaff", "serviceAdvisor"), catchAsync(getPartById));
partRouter.post("", requireRole("admin", "partsStaff"), catchAsync(createPart));
partRouter.put("/:id", requireRole("admin", "partsStaff"), catchAsync(updatePart));
partRouter.delete("/:id", requireRole("admin", "partsStaff"), catchAsync(deletePart));
