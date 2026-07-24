import mongoose, { Schema } from "mongoose";

export const REPAIR_ORDER_STATUSES = [
  "pending",
  "inProgress",
  // Exception states. Previously a vehicle sitting three days waiting on a part
  // and one sitting three days because nobody picked it up were both just
  // "inProgress" — indistinguishable, so the cause of a delay could never be
  // measured. Time spent in waiting* is also excluded from technician
  // productivity, since it isn't the technician's to control.
  "waitingParts",
  "waitingCustomer",
  "onHold",
  "completed",
  "reworkRequired",
  // Post-QC handover states. "completed" means the work is done; it does NOT
  // mean the car left the garage. Without these the system genuinely could not
  // tell an invoiced-but-still-parked vehicle from one already handed over.
  "readyForDelivery",
  "delivered",
  "closed",
  "cancelled",
];

/** Statuses in which a repair order is waiting on someone outside the workshop.
 *  Time accrued here is excluded from technician time-on-job (Phase 4 KPIs). */
export const WAITING_STATUSES = ["waitingParts", "waitingCustomer", "onHold"];

/** Terminal statuses — an order here is finished and must not be mutated
 *  without an explicit, audited reopen. */
export const TERMINAL_ORDER_STATUSES = ["closed", "cancelled"];

// Per-line progress on a repair order's service list. Deliberately a subset
// of REPAIR_ORDER_STATUSES — "cancelled"/"reworkRequired" are whole-order
// concepts a single line can't independently be in.
export const ORDER_SERVICE_STATUSES = ["pending", "inProgress", "completed"];

// Who pays for a given line of work. This is what makes an invoice honest: only
// customerPay lines are billed to the customer; warranty/insurance go to the
// respective payer, and internal is the garage eating a cost (e.g. redoing its
// own faulty work on a comeback). Without it every line was implicitly
// customer-billed, so a warranty job or a comeback couldn't be modelled.
export const JOB_TYPES = ["customerPay", "warranty", "internal", "insurance", "goodwill"];

const orderServiceSchema = new Schema(
  {
    // Optional, not required: a line synced in from an approved custom
    // quotation item or an approved technician additional-service request may
    // not map to a real Service catalog entry.
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
    },
    // Carried through from the approved quote line for `kind: "part"` entries,
    // so the order knows which catalogue item to reserve and later issue from
    // the store — and so cost of goods sold can be attributed to this job.
    partId: {
      type: Schema.Types.ObjectId,
      ref: "Part",
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
    // Who pays for this line — see JOB_TYPES. Only customerPay lines land on the
    // customer's invoice.
    jobType: {
      type: String,
      enum: JOB_TYPES,
      default: "customerPay",
    },
    // The technician's 3C record for this line (the "Complaint" is the line
    // itself). Standard warranty-documentation shape: why it failed and what
    // was actually done — required by warranty claims and useful for any
    // dispute.
    cause: {
      type: String,
      trim: true,
    },
    correction: {
      type: String,
      trim: true,
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

// A single quality-control checklist entry recorded at QC sign-off.
const qcChecklistItemSchema = new Schema(
  {
    label: { type: String, trim: true },
    result: { type: String, enum: ["pass", "fail", "na"], default: "pass" },
    note: { type: String, trim: true },
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
    // Human-readable business number, e.g. "RO-202607-00001". Assigned at
    // creation via utils/sequence.js. Sparse+unique so the many pre-existing
    // orders without a code (backfilled by a migration) don't collide on null.
    code: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
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
    // ===== Reception intake record (walk-around) =====
    // Fuel level noted at intake, the walk-around photos documenting existing
    // damage, and the customer's authorising signature (data URL / uploaded
    // URL). Together they are the evidence that protects both sides in a
    // dispute — previously reception captured none of it.
    fuelLevel: {
      type: String,
      trim: true,
    },
    receptionPhotos: {
      type: [String],
      default: [],
    },
    receptionSignature: {
      type: String,
    },
    // The vehicle arrived on a tow — it can't be road-tested on intake and is
    // flagged so QC knows to plan a test drive once it runs.
    isTowIn: {
      type: Boolean,
      default: false,
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
    // ===== Quality-control gate =====
    // Set only when a QC inspection actually PASSES. This — not status ===
    // "completed" — is what authorises invoicing. Before this existed, a
    // technician marking their own work "completed" was enough to bill the
    // customer, so QC was effectively optional at the data layer and enforced
    // only by the UI (which an API call bypasses entirely).
    qcPassedAt: {
      type: Date,
    },
    // Who signed off. Recorded so "the person who did the work must not be the
    // person who passes it" is verifiable after the fact, not just at the
    // moment of the check.
    qcBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // The checklist the inspector actually ran, and — for a road-tested job —
    // the distance driven, so a QC sign-off is an auditable record, not just a
    // timestamp.
    qcChecklist: {
      type: [qcChecklistItemSchema],
      default: [],
    },
    qcTestDriveKm: {
      type: Number,
      min: 0,
    },

    // ===== Handover =====
    deliveredAt: {
      type: Date,
    },
    deliveredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // The customer's signature acknowledging they received the vehicle, and
    // whether the replaced parts were handed back / shown to them (a standard
    // handover courtesy and a trust signal).
    deliverySignature: {
      type: String,
    },
    oldPartsReturned: {
      type: Boolean,
      default: false,
    },

    // ===== Service warranty =====
    // Stamped at delivery. The job is guaranteed until whichever of these comes
    // first — a date, or an odometer reading. They're what makes a later return
    // checkable as "still under warranty" rather than a judgement call.
    warrantyUntilDate: {
      type: Date,
    },
    warrantyUntilKm: {
      type: Number,
      min: 0,
    },

    // ===== Comeback =====
    // A comeback is a customer returning because a previous repair didn't hold
    // — distinct from reworkRequired, which is QC catching it BEFORE the car
    // ever left. Set when this order was opened to redo earlier work; parentRoId
    // points at that original order so the workmanship can be traced and the
    // comeback rate measured.
    parentRoId: {
      type: Schema.Types.ObjectId,
      ref: "RepairOrder",
    },
    isComeback: {
      type: Boolean,
      default: false,
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
