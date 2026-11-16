import { describe, expect, it } from "vitest";

import {
  createSaleSchema,
  customerRepaymentSchema,
  expenseInputSchema,
  productInputSchema,
  salePaymentSchema,
} from "@/server/validation/bookkeeping";

describe("bookkeeping input validation", () => {
  it("rejects negative sale cash amounts", () => {
    const result = createSaleSchema.safeParse({
      merchantId: "clh3o5zqj0000qzrmn831i7rn",
      currency: "XOF",
      paymentMethod: "CASH",
      cashPaidMinor: -1,
      idempotencyKey: "sale_test_key_01",
      lines: [
        {
          productName: "Water",
          quantity: 1,
          unitPriceMinor: 500,
          currency: "XOF",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid product prices", () => {
    expect(
      productInputSchema.safeParse({
        merchantId: "clh3o5zqj0000qzrmn831i7rn",
        name: "Water",
        unitPriceMinor: -5,
      }).success,
    ).toBe(false);
  });

  it("rejects zero repayment amounts", () => {
    expect(
      customerRepaymentSchema.safeParse({
        merchantId: "clh3o5zqj0000qzrmn831i7rn",
        customerId: "clh3o5zqj0000qzrmn831i7r2",
        amountMinor: 0,
        idempotencyKey: "repay_test_key_01",
      }).success,
    ).toBe(false);
  });

  it("accepts a valid expense", () => {
    const result = expenseInputSchema.safeParse({
      merchantId: "clh3o5zqj0000qzrmn831i7rn",
      category: "Transport",
      description: "Delivery",
      amountMinor: 1500,
      occurredOn: "2026-11-15",
      idempotencyKey: "expense_test_key_01",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid sale payment", () => {
    const result = salePaymentSchema.safeParse({
      merchantId: "clh3o5zqj0000qzrmn831i7rn",
      saleId: "clh3o5zqj0000qzrmn831i7r3",
      amountMinor: 250,
      idempotencyKey: "pay_test_key_01",
    });
    expect(result.success).toBe(true);
  });
});
