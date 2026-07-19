import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { createApp } from "./app.js";

/** Connects the database first, then starts the HTTP server. */
async function start() {
  try {
    await connectDb();
    const app = createApp();
    app.listen(env.port, () => {
      console.log(`[server] listening on http://localhost:${env.port}`);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[server] failed to start:", message);
    process.exit(1);
  }
}

start();
