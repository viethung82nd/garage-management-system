import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { validateRegisterBody, validateLoginBody } from "../validators/auth.validator.js";
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

authRouter.post("/register", validateBody(validateRegisterBody), catchAsync(register));
authRouter.post("/login", validateBody(validateLoginBody), catchAsync(login));

// Password recovery + email verification (public, OTP-based).
authRouter.post("/forgot-password", catchAsync(forgotPassword));
authRouter.post("/send-otp", catchAsync(sendOtp));
authRouter.post("/verify-otp", catchAsync(verifyOtp));
authRouter.post("/reset-password", catchAsync(resetPassword));

// Own profile.
authRouter.get("/me", requireAuth, catchAsync(me));
authRouter.put("/me", requireAuth, catchAsync(updateMe));
authRouter.delete("/me", requireAuth, catchAsync(deleteMe));

authRouter.post("/staff", requireAuth, requireRole("admin"), catchAsync(createStaff));
