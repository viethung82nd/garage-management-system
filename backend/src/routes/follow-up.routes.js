import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  createFollowUp,
  generateFollowUps,
  listFollowUps,
  getSatisfactionSummary,
  recordFollowUpOutcome,
} from "../controllers/follow-up.controller.js";

export const followUpRouter = Router();

followUpRouter.use(requireAuth, requireRole("serviceAdvisor", "admin"));

// Fixed paths before "/:id" so they're never parsed as a follow-up ID.
followUpRouter.post("/generate", catchAsync(generateFollowUps));
followUpRouter.get("/satisfaction", catchAsync(getSatisfactionSummary));
followUpRouter.post("", catchAsync(createFollowUp));
followUpRouter.get("", catchAsync(listFollowUps));
followUpRouter.patch("/:id", catchAsync(recordFollowUpOutcome));
