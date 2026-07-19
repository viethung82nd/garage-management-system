import mongoose, { Schema } from "mongoose";

const lookupSessionSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lookupCode: {
      type: String,
      required: true,
    },
    sessionToken: {
      type: String,
      required: true,
      unique: true,
    },
    expiredAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Sessions are removed automatically once they expire.
lookupSessionSchema.index({ expiredAt: 1 }, { expireAfterSeconds: 0 });

export const LookupSessionModel = mongoose.model(
  "LookupSession",
  lookupSessionSchema
);
