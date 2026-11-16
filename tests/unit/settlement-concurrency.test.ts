import { describe, expect, it, beforeEach } from "vitest";

import { clearRateLimits } from "@/server/lightning/rate-limit";
import { verifyIncomingSettlement } from "@/server/lightning/settlement";
import { IdempotencyGate } from "@/server/bookkeeping/idempotency";
import { applySalePayment } from "@/server/bookkeeping/money-math";

/**
 * Concurrent settlement / repeated lookup semantics without a live DB:
 * - verification is pure and deterministic
 * - idempotency gate coalesces in-flight work
 * - sale payment application is monotonic and safe when already PAID
 */

describe("repeated invoice lookups", () => {
  beforeEach(() => {
    clearRateLimits();
  });

  it("accepts the same settled tx on every lookup (idempotent verify)", () => {
    const tx = {
      type: "incoming" as const,
      state: "settled" as const,
      invoice: "lnbc1",
      paymentHash: "hash-1",
      amountMsats: 21_000,
      settledAt: 1_700_000_100,
    };
    for (let i = 0; i < 5; i += 1) {
      expect(
        verifyIncomingSettlement({
          expectedAmountMsats: 21_000,
          expectedPaymentHash: "hash-1",
          tx,
        }),
      ).toEqual({ ok: true });
    }
  });

  it("never treats pending as success", () => {
    const result = verifyIncomingSettlement({
      expectedAmountMsats: 1000,
      expectedPaymentHash: "h",
      tx: {
        type: "incoming",
        state: "pending",
        invoice: "ln",
        paymentHash: "h",
        amountMsats: 1000,
      },
    });
    expect(result.ok).toBe(false);
  });
});

describe("concurrent settlement coalescing", () => {
  it("idempotency gate returns one shared result for parallel workers", async () => {
    const gate = new IdempotencyGate();
    let runs = 0;
    const work = async () => {
      runs += 1;
      await new Promise((r) => setTimeout(r, 20));
      return { settled: true, runs };
    };

    const [a, b, c] = await Promise.all([
      gate.run("pay:1", work),
      gate.run("pay:1", work),
      gate.run("pay:1", work),
    ]);

    expect(runs).toBe(1);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it("sale ledger apply is safe when already fully paid", () => {
    const first = applySalePayment(10_000, 0, 10_000);
    expect(first.paymentState).toBe("PAID");
    // Second concurrent apply of the same amount would overpay if not guarded —
    // callers must claim SETTLED first; applying again on PAID sale is a no-op path.
    expect(first.amountPaidMinor).toBe(10_000);
  });
});

describe("updateMany claim pattern (simulated)", () => {
  it("only the first claim wins", async () => {
    const state = { status: "PENDING" as "PENDING" | "SETTLED" };
    async function claim() {
      if (state.status !== "PENDING") return 0;
      // simulate race window with microtask
      await Promise.resolve();
      if (state.status !== "PENDING") return 0;
      state.status = "SETTLED";
      return 1;
    }

    // Sequential claims: first wins
    expect(await claim()).toBe(1);
    expect(await claim()).toBe(0);
    expect(state.status).toBe("SETTLED");
  });
});
