import mongoose, { Schema } from "mongoose";

/** What an OTP authorizes. Kept small and explicit so a code for one flow can
 *  never be replayed against another. */
export const OTP_PURPOSES = ["passwordReset", "emailVerification"];

const otpSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    // Only the SHA-256 hash of the code is stored — a leaked collection cannot
    // reveal live codes. Attempt-limiting below covers the small keyspace.
    codeHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: OTP_PURPOSES,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    // Set once the code is spent; a consumed OTP can never be reused.
    consumedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Latest-unconsumed lookup path: find the newest live code for an email + flow.
otpSchema.index({ email: 1, purpose: 1, createdAt: -1 });
// Expired codes are purged automatically by Mongo's TTL monitor.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpModel = mongoose.model("Otp", otpSchema);
