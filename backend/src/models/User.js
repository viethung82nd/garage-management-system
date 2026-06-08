import mongoose, { Schema } from "mongoose";

export const USER_ROLES = ["admin", "staff", "customer"];

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "staff",
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
