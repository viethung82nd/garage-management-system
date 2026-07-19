import mongoose, { Schema } from "mongoose";

export const USER_ROLES = [
  "onlineCustomer",
  "walkInCustomer",
  "serviceAdvisor",
  "technician",
  "accountant",
  "admin",
];

export const ACCOUNT_TYPES = ["registered", "walkIn"];

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    passwordHash: {
      type: String,
    },
    lookupCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    accountType: {
      type: String,
      enum: ACCOUNT_TYPES,
      default: "registered",
    },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Never leak the password hash when a user is serialized to JSON.
userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

export const UserModel = mongoose.model("User", userSchema);
