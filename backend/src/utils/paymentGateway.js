import { randomUUID } from "crypto";

/**
 * Mock payment gateway. Stands in for a real provider (VNPay, Stripe, …) so the
 * payment flow can be exercised end-to-end without external credentials.
 *
 * The outcome is controllable via `simulate` for testing: "fail" forces a
 * declined charge, anything else (the default) succeeds. The returned shape
 * mirrors what a real gateway would hand back — a reference and a raw payload.
 */
export async function charge({ amount, method, simulate }) {
  // Simulate the small round-trip a real gateway call would incur.
  await new Promise((resolve) => setTimeout(resolve, 10));

  const outcome = simulate === "fail" ? "failed" : "succeeded";
  const processedAt = new Date().toISOString();

  return {
    status: outcome,
    gatewayRef: `MOCK-${randomUUID()}`,
    payload: {
      gateway: "mock",
      outcome,
      amount,
      method,
      processedAt,
      ...(outcome === "failed" ? { declineReason: "simulated decline" } : {}),
    },
  };
}
