import mongoose, { Schema } from "mongoose";

export const REPAIR_ORDER_STATUSES = [
  "pending",
  "inProgress",
  "completed",
  "reworkRequired",
  "cancelled",
];

// Per-line progress on a repair order's service list. Deliberately a subset
// of REPAIR_ORDER_STATUSES — "cancelled"/"reworkRequired" are whole-order
// concepts a single line can't independently be in.
export const ORDER_SERVICE_STATUSES = ["pending", "inProgress", "completed"];

const orderServiceSchema = new Schema(
  {
    // Optional, not required: a line synced in from an approved custom
    // quotation item or an approved technician additional-service request may
    // not map to a real Service catalog entry.
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
    },
    name: {
      type: String,
      required: true,
    },
    priceAtTime: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    // Mirrors ServiceQuote's own line kind — lets the accountant's invoice
    // distinguish labor from parts instead of one flat "service" list.
    kind: {
      type: String,
      enum: ["service", "part", "labor"],
      default: "service",
    },
    // Where this line came from: the SA's originally-confirmed quotation, or
    // a technician's additional-service request approved mid-repair. Lets the
    // invoice explain a total that grew past what was originally quoted
    // instead of it looking like an unexplained mismatch.
    source: {
      type: String,
      enum: ["quote", "additionalService"],
      default: "quote",
    },
    // Lets a technician work through a multi-line order one item at a time
    // (PATCH /:id/progress with a stepIndex) without every "complete this
    // line" action marking the whole order — and therefore the whole job —
    // complete. The order's own top-level status is recomputed from these.
    status: {
      type: String,
      enum: ORDER_SERVICE_STATUSES,
      default: "pending",
    },
  },
  { _id: false },
);

const stepNoteSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    technicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Index into services[] this note is about, when the technician was
    // working a specific line rather than leaving a general order note.
    stepIndex: {
      type: Number,
      min: 0,
    },
    // Photos the technician attached to this note — evidence of the actual
    // repair work performed, distinct from the advisor's pre-repair
    // inspection photos. Surfaced alongside them on the QC evidence view.
    photos: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const repairOrderSchema = new Schema(
  {
    inspectionId: {
      type: Schema.Types.ObjectId,
      ref: "InspectionReport",
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    advisorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    technicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // Captured at Reception: what the customer described as the problem or
    // requested service, and when the SA promised the vehicle back.
    issueDescription: {
      type: String,
      trim: true,
    },
    // The service category the customer chose when booking, copied from the
    // originating Booking at Reception (matches a ServiceCategory.name). Lets
    // the SA's inspection checklist show that category's services instead of a
    // generic seed. Empty for walk-ins with no booking.
    serviceCategory: {
      type: String,
      trim: true,
    },
    promisedAt: {
      type: Date,
    },
    services: {
      type: [orderServiceSchema],
      default: [],
    },
    // Snapshot of the confirmed ServiceQuote that produced services[] — lets
    // the accountant's invoice reconstruct the originally-quoted discount/tax
    // (which are otherwise nowhere on the order) and cross-reference the quote.
    quoteId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceQuote",
    },
    quotedDiscountPercent: {
      type: Number,
      default: 0,
    },
    quotedTaxPercent: {
      type: Number,
      default: 0,
    },
    quotedTotal: {
      type: Number,
    },
    stepNotes: {
      type: [stepNoteSchema],
      default: [],
    },
    status: {
      type: String,
      enum: REPAIR_ORDER_STATUSES,
      default: "pending",
    },
    totalCost: {
      type: Number,
      min: 0,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    // Set by POST /:id/forward-to-accountant once QC has passed — the SA's
    // signal that this order is ready to be invoiced. Also doubles as the
    // "already forwarded" flag so the action isn't offered twice.
    forwardedToAccountantAt: {
      type: Date,
    },
    // Set once an accountant generates an invoice for this order — the
    // accountant can bill directly off the completed-orders queue without
    // waiting on forwardedToAccountantAt, so this is the real "nothing left
    // to do here" signal for the SA's own Quality Check queue.
    invoicedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

export const RepairOrderModel = mongoose.model(
  "RepairOrder",
  repairOrderSchema,
);
