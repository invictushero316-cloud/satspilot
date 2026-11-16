import { describe, expect, it } from "vitest";

import { clearRateLimits, allowRateLimited } from "@/server/lightning/rate-limit";
import {
  assertReceiveCapabilities,
  REQUIRED_NWC_METHODS,
} from "@/server/lightning/types";
import { verifyIncomingSettlement } from "@/server/lightning/settlement";
import { MockLightningProvider } from "@/server/lightning/mock-provider";

describe("NWC receive capability checks", () => {
  it("requires make_invoice and lookup_invoice", () => {
    expect(REQUIRED_NWC_METHODS).toEqual(["make_invoice", "lookup_invoice"]);
    expect(() =>
      assertReceiveCapabilities(["get_info", "pay_invoice"]),
    ).toThrow(/make_invoice/);
    expect(() =>
      assertReceiveCapabilities(["make_invoice", "get_info"]),
    ).toThrow(/lookup_invoice/);
  });

  it("flags pay_invoice when present but still accepts receive methods", () => {
    const result = assertReceiveCapabilities([
      "make_invoice",
      "lookup_invoice",
      "pay_invoice",
    ]);
    expect(result.includesPayInvoice).toBe(true);
  });

  it("accepts receive-only method sets", () => {
    const result = assertReceiveCapabilities([
      "make_invoice",
      "lookup_invoice",
      "get_info",
    ]);
    expect(result.includesPayInvoice).toBe(false);
  });
});

describe("verifyIncomingSettlement", () => {
  const base = {
    expectedAmountMsats: 21_000,
    expectedPaymentHash: "abc123",
    tx: {
      type: "incoming" as const,
      state: "settled" as const,
      invoice: "lnbc…",
      paymentHash: "abc123",
      amountMsats: 21_000,
    },
  };

  it("accepts matching incoming settled payments", () => {
    expect(verifyIncomingSettlement(base)).toEqual({ ok: true });
  });

  it("rejects hash mismatch", () => {
    const result = verifyIncomingSettlement({
      ...base,
      tx: { ...base.tx, paymentHash: "other" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects outgoing payments even if settled", () => {
    const result = verifyIncomingSettlement({
      ...base,
      tx: { ...base.tx, type: "outgoing" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/incoming/);
  });

  it("rejects amount mismatches", () => {
    const result = verifyIncomingSettlement({
      ...base,
      tx: { ...base.tx, amountMsats: 22_000 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/amount mismatch/);
  });

  it("rejects non-settled states (browser paid=true is irrelevant)", () => {
    const result = verifyIncomingSettlement({
      ...base,
      tx: { ...base.tx, state: "pending" },
    });
    expect(result.ok).toBe(false);
  });
});

describe("MockLightningProvider (tests / labeled demo only)", () => {
  it("creates invoices and settles on lookup", async () => {
    const provider = new MockLightningProvider();
    const invoice = await provider.makeInvoice({
      amountMsats: 1000,
      description: "test",
    });
    expect(invoice.type).toBe("incoming");
    expect(invoice.state).toBe("pending");
    expect(invoice.amountMsats).toBe(1000);

    const settled = await provider.lookupInvoice({
      paymentHash: invoice.paymentHash,
    });
    expect(settled.state).toBe("settled");
    expect(settled.amountMsats).toBe(1000);
    provider.close();
  });

  it("supports expiry scenario", async () => {
    const provider = new MockLightningProvider(
      ["make_invoice", "lookup_invoice", "get_info"],
      "expired",
    );
    const invoice = await provider.makeInvoice({ amountMsats: 500 });
    const looked = await provider.lookupInvoice({
      paymentHash: invoice.paymentHash,
    });
    expect(looked.state).toBe("expired");
    provider.close();
  });

  it("supports amount mismatch scenario", async () => {
    const provider = new MockLightningProvider(
      ["make_invoice", "lookup_invoice", "get_info"],
      "amount_mismatch",
    );
    const invoice = await provider.makeInvoice({ amountMsats: 5000 });
    const looked = await provider.lookupInvoice({
      paymentHash: invoice.paymentHash,
    });
    expect(looked.amountMsats).not.toBe(5000);
    const check = verifyIncomingSettlement({
      expectedAmountMsats: 5000,
      expectedPaymentHash: invoice.paymentHash,
      tx: looked,
    });
    expect(check.ok).toBe(false);
    provider.close();
  });

  it("supports outgoing settlement rejection", async () => {
    const provider = new MockLightningProvider(
      ["make_invoice", "lookup_invoice", "get_info"],
      "outgoing",
    );
    const invoice = await provider.makeInvoice({ amountMsats: 2000 });
    const looked = await provider.lookupInvoice({
      paymentHash: invoice.paymentHash,
    });
    expect(looked.type).toBe("outgoing");
    const check = verifyIncomingSettlement({
      expectedAmountMsats: 2000,
      expectedPaymentHash: invoice.paymentHash,
      tx: looked,
    });
    expect(check.ok).toBe(false);
    provider.close();
  });

  it("surfaces provider errors", async () => {
    const provider = new MockLightningProvider();
    provider.setFailNext(true);
    await expect(provider.getInfo()).rejects.toThrow(/Mock provider error/);
    provider.close();
  });

  it("rejects wallets missing required methods", async () => {
    const provider = new MockLightningProvider(["pay_invoice", "get_info"]);
    await expect(provider.getInfo()).rejects.toThrow(/make_invoice/);
    provider.close();
  });
});

describe("poll rate limiting", () => {
  it("allows then blocks rapid polls for the same key", () => {
    clearRateLimits();
    expect(allowRateLimited("poll:test", 1, 60_000)).toBe(true);
    expect(allowRateLimited("poll:test", 1, 60_000)).toBe(false);
    clearRateLimits();
  });
});

describe("duplicate settlement safety (pure)", () => {
  it("idempotent verification stays ok for the same settled tx", () => {
    const tx = {
      type: "incoming" as const,
      state: "settled" as const,
      invoice: "lnbc1",
      paymentHash: "hash",
      amountMsats: 1000,
    };
    const first = verifyIncomingSettlement({
      expectedAmountMsats: 1000,
      expectedPaymentHash: "hash",
      tx,
    });
    const second = verifyIncomingSettlement({
      expectedAmountMsats: 1000,
      expectedPaymentHash: "hash",
      tx,
    });
    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
  });
});
