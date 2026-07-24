import mongoose, { Schema } from "mongoose";

export const USER_ROLES = [
  "onlineCustomer",
  "walkInCustomer",
  "serviceAdvisor",
  "technician",
  // Quality-control inspector / foreman: signs off completed work before it can
  // be invoiced. A distinct role from serviceAdvisor so the "QC'er must not be
  // the person who did (or sold) the work" separation-of-duties rule is
  // enforceable, not just conventional.
  "qcInspector",
  // Parts/stores staff: the person who actually issues parts to a repair order
  // and manages stock movements — previously only "admin" could touch the parts
  // catalog, which doesn't match how a real garage is staffed.
  "partsStaff",
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

    // ===== Billing identity (business/fleet customers) =====
    // Required on a VAT invoice to a company; a walk-in individual has none of
    // these, which is exactly why they're optional.
    taxCode: {
      type: String,
      trim: true,
    },
    billingName: {
      type: String,
      trim: true,
    },
    billingAddress: {
      type: String,
      trim: true,
    },
    // Trade customers are often billed on terms. This caps how much unpaid
    // invoicing they may carry; 0 means cash-only (no credit), the safe default
    // for an ordinary customer.
    creditLimit: {
      type: Number,
      min: 0,
      default: 0,
    },

    // ===== Technician labour costing =====
    // Internal cost of an hour of this technician's time — the basis for labour
    // gross profit (labour revenue minus what the labour actually costs us).
    // Only meaningful for the technician role.
    hourlyCost: {
      type: Number,
      min: 0,
      default: 0,
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
