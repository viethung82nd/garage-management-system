import mongoose, { Schema } from "mongoose";

export const FOLLOW_UP_STATUSES = ["pending", "contacted", "noAnswer", "closed"];

// What went wrong, in the customer's own words, bucketed to something the
// shop can actually act on in aggregate ("we keep losing points on
// timeliness") rather than a pile of unstructured free-text notes.
export const COMPLAINT_CATEGORIES = [
  "greeting",
  "repairQuality",
  "price",
  "timeliness",
  "cleanliness",
  "explanation",
  "facilities",
  "none",
];

/**
 * A post-delivery check-in obligation: the shop promises to call every
 * customer some time after their vehicle is handed back, both to catch a
 * dissatisfied customer before they simply never return (and never say why),
 * and to build the CSAT/NPS numbers the accountant/manager actually need.
 *
 * One of these is created per delivered RepairOrder, due 72 hours after
 * delivery — long enough that the customer has actually driven the car and
 * formed an opinion, short enough that the visit is still fresh and a
 * problem is still fixable before it hardens into lost trust.
 */
const followUpSchema = new Schema(
  {
    repairOrderId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
      required: true,
      // One follow-up per delivery — never two competing obligations for the
      // same order.
      unique: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    dueAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: FOLLOW_UP_STATUSES,
      default: "pending",
    },
    contactedAt: {
      type: Date,
    },
    contactedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // Light satisfaction capture — deliberately just two numbers and a
    // category rather than a full survey, so the advisor can log the call's
    // outcome in a few seconds instead of skipping it.
    csatScore: {
      type: Number,
      min: 1,
      max: 5,
    },
    npsScore: {
      type: Number,
      min: 0,
      max: 10,
    },
    complaintCategory: {
      type: String,
      enum: COMPLAINT_CATEGORIES,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

// "What's due to be called today" — the hot read driving the follow-up queue.
followUpSchema.index({ status: 1, dueAt: 1 });

export const FollowUpModel = mongoose.model("FollowUp", followUpSchema);
