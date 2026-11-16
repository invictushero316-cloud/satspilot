import type { LightningTransaction } from "@/server/lightning/types";

/**
 * Server-side settlement gate. Client claims (e.g. paid=true) are never consulted.
 * Requires matching payment hash, incoming direction, settled state, and exact msats.
 */
export function verifyIncomingSettlement(input: {
  expectedAmountMsats: number;
  expectedPaymentHash: string;
  tx: LightningTransaction;
}): { ok: true } | { ok: false; reason: string } {
  const { expectedAmountMsats, expectedPaymentHash, tx } = input;

  if (tx.paymentHash !== expectedPaymentHash) {
    return { ok: false, reason: "payment_hash mismatch" };
  }
  if (tx.type !== "incoming") {
    return { ok: false, reason: "not an incoming payment" };
  }
  if (tx.state !== "settled") {
    return { ok: false, reason: `state is ${tx.state}, not settled` };
  }
  if (tx.amountMsats !== expectedAmountMsats) {
    return {
      ok: false,
      reason: `amount mismatch: expected ${expectedAmountMsats} msats, got ${tx.amountMsats}`,
    };
  }
  return { ok: true };
}
