import mongoose from "mongoose";
import { env } from "../config/env.js";

/**
 * Establishes the Mongoose connection. Called once at startup before the
 * HTTP server begins listening, so the app never serves requests without a DB.
 */
export async function connectDb() {
  mongoose.connection.on("connected", () => {
    console.log("[db] connected to MongoDB");
  });
  mongoose.connection.on("error", (err) => {
    console.error("[db] connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[db] disconnected from MongoDB");
  });

  await mongoose.connect(env.mongoUri);
}

/** Reports the current connection state for the health endpoint. */
export function dbStatus() {
  switch (mongoose.connection.readyState) {
    case 1:
      return "connected";
    case 2:
      return "connecting";
    default:
      return "disconnected";
  }
}
