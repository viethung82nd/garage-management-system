import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    repairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
      required: true,
    },
    technicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One review per customer per repair order.
reviewSchema.index({ customerId: 1, repairOrderId: 1 }, { unique: true });

export const ReviewModel = mongoose.model("Review", reviewSchema);
