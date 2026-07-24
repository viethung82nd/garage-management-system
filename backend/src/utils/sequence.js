import { CounterModel } from "../models/counter.model.js";

/**
 * Returns the next integer in a named, atomically-incremented sequence. The
 * upsert + $inc is a single DB operation, so two concurrent callers can never
 * receive the same number — this is the guard behind gapless business codes.
 *
 * Pass the active `session` when called inside a transaction so the counter
 * increment commits/rolls back together with the document it numbers (a rolled
 * back repair order must not burn a code).
 */
export async function nextSequence(key, session) {
  const doc = await CounterModel.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session },
  );
  return doc.seq;
}

/** Zero-padded YYYYMM for the given date (defaults to now). */
function yearMonth(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

/**
 * Builds a monthly, sequential business code such as `RO-202607-00001`.
 * The counter is scoped per prefix per month, so numbering restarts each month
 * and stays human-readable.
 *
 * @param {string} prefix   e.g. "RO" or "INV"
 * @param {object} [opts]
 * @param {import("mongoose").ClientSession} [opts.session] active transaction session
 * @param {Date}   [opts.date]  the date the code is anchored to (default now)
 * @param {number} [opts.pad]   sequence zero-padding width (default 5)
 */
export async function generateCode(prefix, { session, date, pad = 5 } = {}) {
  const ym = yearMonth(date);
  const seq = await nextSequence(`${prefix}-${ym}`, session);
  return `${prefix}-${ym}-${String(seq).padStart(pad, "0")}`;
}
