import dns from "node:dns";

// Some hosts (Render's containers among them) have no outbound IPv6 route,
// but Node 18+ otherwise uses whatever address family the OS resolver
// returns first — an AAAA/IPv6 record for hosts like smtp.gmail.com — so
// every outbound connection (SMTP, and anything else) fails immediately
// with ENETUNREACH. Force IPv4 first, process-wide, before any other module
// gets a chance to open a socket.
dns.setDefaultResultOrder("ipv4first");

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
