import mongoose from "mongoose";

/**
 * Runs `work(session)` inside a MongoDB transaction and returns its result.
 * Every write inside must be passed the `session` (via `.session(session)` on
 * queries, or `{ session }` on `.save()` / `.create([doc], { session })`) or it
 * won't be part of the transaction.
 *
 * Requires a replica-set / mongos topology — the app's MONGODB_URI already
 * points at a replica set, and the test suite runs MongoMemoryReplSet. On a
 * bare standalone `mongod` this will throw (by design: we want the integrity
 * guarantee, not a silent non-transactional fallback).
 *
 * @template T
 * @param {(session: import("mongoose").ClientSession) => Promise<T>} work
 * @returns {Promise<T>}
 */
export async function runInTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
