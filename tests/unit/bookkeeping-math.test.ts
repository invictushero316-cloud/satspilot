import { describe, expect, it } from "vitest";

import {
  applySalePayment,
  buildAnalytics,
  computeLineTotal,
  computeSaleTotals,
  deriveSalePaymentState,
  saleBalanceDue,
  sumLedgerBalance,
} from "@/server/bookkeeping/money-math";
import { ValidationError } from "@/server/errors";
import { IdempotencyGate } from "@/server/bookkeeping/idempotency";

describe("sale totals", () => {
  it("computes integer multi-line totals", () => {
    const result = computeSaleTotals(
      [
        {
          productName: "Water",
          quantity: 3,
          unitPriceMinor: 500,
          currency: "XOF",
        },
        {
          productName: "Bread",
          quantity: 2,
          unitPriceMinor: 300,
          currency: "XOF",
        },
      ],
      "XOF",
    );
    expect(result.totalMinor).toBe(2100);
    expect(result.lines[0]?.lineTotalMinor).toBe(1500);
  });

  it("rejects mismatched item currency", () => {
    expect(() =>
      computeSaleTotals(
        [
          {
            productName: "Water",
            quantity: 1,
            unitPriceMinor: 500,
            currency: "USD",
          },
        ],
        "XOF",
      ),
    ).toThrow(ValidationError);
  });

  it("rejects negative and non-integer amounts", () => {
    expect(() => computeLineTotal(1, -1)).toThrow(ValidationError);
    expect(() => computeLineTotal(1.5 as number, 100)).toThrow(ValidationError);
    expect(() => computeLineTotal(0, 100)).toThrow(ValidationError);
  });
});

describe("partial payments", () => {
  it("tracks unpaid → partial → paid", () => {
    expect(deriveSalePaymentState(1000, 0)).toBe("UNPAID");
    const partial = applySalePayment(1000, 0, 400);
    expect(partial.amountPaidMinor).toBe(400);
    expect(partial.paymentState).toBe("PARTIALLY_PAID");
    expect(saleBalanceDue(1000, 400)).toBe(600);
    const paid = applySalePayment(1000, 400, 600);
    expect(paid.paymentState).toBe("PAID");
  });

  it("rejects overpayment", () => {
    expect(() => applySalePayment(1000, 800, 300)).toThrow(ValidationError);
  });
});

describe("customer balance reconciliation", () => {
  it("equals the sum of valid ledger entries", () => {
    const balance = sumLedgerBalance([
      { entryType: "DEBIT", amountMinor: 2500 },
      { entryType: "CREDIT", amountMinor: 1000 },
      { entryType: "DEBIT", amountMinor: 500 },
    ]);
    expect(balance).toBe(2000);
  });
});

describe("analytics buckets", () => {
  it("tracks gross sales, receipts, refunds, expenses separately", () => {
    const analytics = buildAnalytics({
      currency: "XOF",
      grossSalesMinor: 10000,
      receiptsMinor: 8000,
      refundsMinor: 500,
      expensesMinor: 2000,
      outstandingBalancesMinor: 1500,
    });
    expect(analytics.netReceiptsMinor).toBe(7500);
    expect(analytics.salesMinusExpensesMinor).toBe(8000);
    // Explicitly not labeled profit in the helper API.
    expect(analytics).not.toHaveProperty("profit");
  });
});

describe("duplicate submission / concurrency", () => {
  it("coalesces concurrent work for the same idempotency key", async () => {
    const gate = new IdempotencyGate();
    let runs = 0;

    const work = async () => {
      runs += 1;
      await new Promise((r) => setTimeout(r, 20));
      return { id: "sale_1", runs };
    };

    const [a, b] = await Promise.all([
      gate.run("key-1", work),
      gate.run("key-1", work),
    ]);

    expect(a).toEqual(b);
    expect(runs).toBe(1);
  });

  it("allows distinct keys to run concurrently", async () => {
    const gate = new IdempotencyGate();
    let runs = 0;
    const work = async (id: string) => {
      runs += 1;
      await new Promise((r) => setTimeout(r, 10));
      return id;
    };

    const [a, b] = await Promise.all([
      gate.run("a", () => work("a")),
      gate.run("b", () => work("b")),
    ]);

    expect(a).toBe("a");
    expect(b).toBe("b");
    expect(runs).toBe(2);
  });
});

describe("cross-merchant access helper expectations", () => {
  it("sale payment state never silently exceeds totals", () => {
    expect(() => deriveSalePaymentState(100, 101)).toThrow(ValidationError);
  });
});
