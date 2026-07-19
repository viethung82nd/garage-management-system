import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import { getAllParts, getPartById, createPart, updatePart, deletePart } from "../controllers/part.controller.js";

export const partRouter = Router();

partRouter.use(requireAuth, requireRole("admin"));

partRouter.get("", catchAsync(getAllParts));
partRouter.get("/:id", catchAsync(getPartById));
partRouter.post("", catchAsync(createPart));
partRouter.put("/:id", catchAsync(updatePart));
partRouter.delete("/:id", catchAsync(deletePart));
