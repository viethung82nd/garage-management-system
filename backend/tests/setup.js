import { beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// Must be set before any src module (config/env.js) is imported by a test file.
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gms-test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

let mongod;

beforeAll(async () => {
  // A single-node replica set (not a bare standalone) so MongoDB transactions
  // work under test — the app uses them for the multi-document flows
  // (reception, quote confirm, additional-service approve). Production's
  // MONGODB_URI already points at a replica set.
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongod.getUri());
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});
