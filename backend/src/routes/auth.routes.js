import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error.js";
import {
  register,
  login,
  me,
  createStaff,
  updateMe,
  deleteMe,
  forgotPassword,
  sendOtp,
  verifyOtp,
  resetPassword,
} from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", asyncHandler(register));
authRouter.post("/login", asyncHandler(login));

// Password recovery + email verification (public, OTP-based).
authRouter.post("/forgot-password", asyncHandler(forgotPassword));
authRouter.post("/send-otp", asyncHandler(sendOtp));
authRouter.post("/verify-otp", asyncHandler(verifyOtp));
authRouter.post("/reset-password", asyncHandler(resetPassword));

// Own profile.
authRouter.get("/me", requireAuth, asyncHandler(me));
authRouter.put("/me", requireAuth, asyncHandler(updateMe));
authRouter.delete("/me", requireAuth, asyncHandler(deleteMe));

authRouter.post("/staff", requireAuth, requireRole("admin"), asyncHandler(createStaff));
