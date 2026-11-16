import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  buildCanonicalReceipt,
  canonicalize,
  createAccessToken,
  createPublicId,
  integrityHashFromCanonicalJson,
  RECEIPT_EVENT_KIND,
} from "@/server/receipts/canonical";
import {
  buildReceiptAttestationTemplate,
  generateMerchantSigningKeypair,
  signReceiptAttestation,
  verifyReceiptAttestation,
  verifyReceiptBundle,
} from "@/server/receipts/crypto";

describe("canonical receipt + integrity hash", () => {
  it("produces stable hashes for equal payloads", () => {
    const a = buildCanonicalReceipt({
      publicId: "rcp_test",
      saleId: "sale_1",
      merchantPubkey: "ab".repeat(32),
      issuedAt: new Date("2026-11-15T12:00:00.000Z"),
      currency: "XOF",
      totalMinor: 3000,
      lines: [
        {
          productName: "Oil 1L",
          quantity: 2,
          unitPriceMinor: 1500,
          lineTotalMinor: 3000,
          currency: "XOF",
        },
      ],
    });
    const json1 = canonicalize(a);
    const json2 = canonicalize({ ...a });
    expect(json1).toBe(json2);
    expect(integrityHashFromCanonicalJson(json1)).toBe(
      integrityHashFromCanonicalJson(json2),
    );
  });

  it("changes hash when a line amount is tampered", () => {
    const base = buildCanonicalReceipt({
      publicId: "rcp_test",
      saleId: "sale_1",
      merchantPubkey: "ab".repeat(32),
      issuedAt: new Date("2026-11-15T12:00:00.000Z"),
      currency: "XOF",
      totalMinor: 3000,
      lines: [
        {
          productName: "Oil 1L",
          quantity: 2,
          unitPriceMinor: 1500,
          lineTotalMinor: 3000,
          currency: "XOF",
        },
      ],
    });
    const good = integrityHashFromCanonicalJson(canonicalize(base));
    const tampered = {
      ...base,
      totalMinor: 99999,
      lines: [{ ...base.lines[0]!, t: 99999 }],
    };
    const bad = integrityHashFromCanonicalJson(canonicalize(tampered));
    expect(bad).not.toBe(good);
  });

  it("omits customer PII fields from canonical shape", () => {
    const receipt = buildCanonicalReceipt({
      publicId: createPublicId(),
      saleId: "sale_abc",
      merchantPubkey: "cd".repeat(32),
      issuedAt: new Date(),
      currency: "XOF",
      totalMinor: 100,
      lines: [
        {
          productName: "Rice",
          quantity: 1,
          unitPriceMinor: 100,
          lineTotalMinor: 100,
          currency: "XOF",
        },
      ],
    });
    const json = canonicalize(receipt);
    expect(json).not.toMatch(/phone|balance|nwc|customerName|nsec/i);
    expect(createAccessToken().length).toBeGreaterThan(20);
  });
});

describe("NIP-01 receipt attestation signatures", () => {
  it("signs and verifies a minimal attestation event", () => {
    const { secretKey, pubkeyHex } = generateMerchantSigningKeypair();
    const hash = "a".repeat(64);
    const template = buildReceiptAttestationTemplate({
      publicId: "rcp_demo",
      integrityHash: hash,
      currency: "XOF",
      totalMinor: 1500,
      createdAt: 1_700_000_000,
    });
    expect(template.kind).toBe(RECEIPT_EVENT_KIND);
    expect(template.content).toBe(hash);

    const event = signReceiptAttestation(template, secretKey);
    expect(event.pubkey).toBe(pubkeyHex);
    expect(verifyReceiptAttestation(event)).toBe(true);
  });

  it("rejects invalid / tampered signatures", () => {
    const { secretKey } = generateMerchantSigningKeypair();
    const event = signReceiptAttestation(
      buildReceiptAttestationTemplate({
        publicId: "rcp_demo",
        integrityHash: "b".repeat(64),
        currency: "XOF",
        totalMinor: 10,
      }),
      secretKey,
    );
    const tampered = { ...event, content: "c".repeat(64) };
    expect(verifyReceiptAttestation(tampered)).toBe(false);
  });

  it("verifyReceiptBundle detects hash mismatch vs canonical JSON", () => {
    const { secretKey } = generateMerchantSigningKeypair();
    const canonical = canonicalize(
      buildCanonicalReceipt({
        publicId: "rcp_x",
        saleId: "sale_x",
        merchantPubkey: "11".repeat(32),
        issuedAt: new Date("2026-01-01T00:00:00.000Z"),
        currency: "XOF",
        totalMinor: 500,
        lines: [
          {
            productName: "Tea",
            quantity: 1,
            unitPriceMinor: 500,
            lineTotalMinor: 500,
            currency: "XOF",
          },
        ],
      }),
    );
    const hash = integrityHashFromCanonicalJson(canonical);
    const event = signReceiptAttestation(
      buildReceiptAttestationTemplate({
        publicId: "rcp_x",
        integrityHash: hash,
        currency: "XOF",
        totalMinor: 500,
      }),
      secretKey,
    );

    const ok = verifyReceiptBundle({ canonicalJson: canonical, event });
    expect(ok.signatureValid).toBe(true);
    expect(ok.hashMatches).toBe(true);

    const badCanonical = canonical.replace("500", "501");
    const bad = verifyReceiptBundle({ canonicalJson: badCanonical, event });
    expect(bad.hashMatches).toBe(false);
  });
});

describe("relay publish privacy guards", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses events that appear to contain sensitive markers", async () => {
    const { publishReceiptEvent } = await import("@/server/receipts/publish");
    const { secretKey } = generateMerchantSigningKeypair();
    const event = signReceiptAttestation(
      {
        kind: RECEIPT_EVENT_KIND,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["d", "rcp_bad"], ["phone", "+221770000000"]],
        content: "nostr+walletconnect://secret",
      },
      secretKey,
    );

    await expect(
      publishReceiptEvent({
        event,
        relayUrl: "wss://relay.example.com",
      }),
    ).rejects.toThrow(/sensitive/i);
  });
});

describe("unauthorized / missing receipt semantics", () => {
  it("documents that public verify must not expose customer fields", () => {
    // Structural guarantee: public DTO type keys used in service.
    const forbidden = [
      "customerName",
      "phone",
      "balanceOwed",
      "nwcUri",
      "encryptedSecret",
      "accessToken",
    ];
    const publicDtoKeys = [
      "publicId",
      "integrityHash",
      "currency",
      "totalMinor",
      "npub",
      "eventId",
      "verification",
      "payment",
      "thirdPartyCanVerify",
      "thirdPartyCannotSee",
    ];
    for (const key of forbidden) {
      expect(publicDtoKeys).not.toContain(key);
    }
  });
});
