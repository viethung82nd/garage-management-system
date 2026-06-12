import mongoose, { Schema } from "mongoose";

const serviceCategorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export const ServiceCategoryModel = mongoose.model(
  "ServiceCategory",
  serviceCategorySchema,
);
