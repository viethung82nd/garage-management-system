import { Schema } from "mongoose";

/** Channels through which a customer's authorisation can be obtained. */
export const APPROVAL_CHANNELS = ["app", "inPerson", "phone", "zalo", "email", "sms"];

/**
 * The evidence trail for a customer authorisation, attached to anything the
 * customer must approve before money is spent (a quote, a change order).
 *
 * The shape is dictated by what a consumer-protection regulator expects a shop
 * to be able to produce in a dispute: WHO authorised it, WHEN (to the minute),
 * through WHICH channel, at WHAT contact address, and WHAT exactly they were
 * shown. Recording merely "status = approved" — which is all this system used
 * to do — proves nothing if the customer later says "I never agreed to that".
 *
 * Two situations produce a record here:
 *  - Self-service: an account holder approves in the app. `decidedBy` is their
 *    user id and `recordedBy` is empty.
 *  - Relayed: a walk-in customer with no account approves by phone/in person
 *    and a staff member records it. `recordedBy` is the staff member and
 *    `decidedByName` + `contactValue` identify the actual authoriser — without
 *    those the record would just be "a staff member said so".
 *
 * Returned as a factory because Mongoose sub-schemas must not be shared by
 * reference across parent schemas.
 */
export function createApprovalSchema() {
  return new Schema(
    {
      // The customer account that approved, when they did it themselves.
      decidedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      // Name of the human who actually authorised. Required for relayed
      // approvals, where decidedBy is necessarily empty.
      decidedByName: {
        type: String,
        trim: true,
      },
      decidedAt: {
        type: Date,
        default: Date.now,
      },
      channel: {
        type: String,
        enum: APPROVAL_CHANNELS,
        required: true,
      },
      // The phone number / email actually contacted, so the trail points at a
      // real contact attempt rather than an unverifiable claim.
      contactValue: {
        type: String,
        trim: true,
      },
      // The staff member who recorded a relayed approval. Empty for
      // self-service — that distinction is what separates "the customer said
      // yes" from "an employee says the customer said yes".
      recordedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      note: {
        type: String,
        trim: true,
      },
      // What the customer was actually shown at the moment of approval, so the
      // approved figure can never be reconstructed differently later.
      approvedTotal: {
        type: Number,
      },
    },
    { _id: false },
  );
}
