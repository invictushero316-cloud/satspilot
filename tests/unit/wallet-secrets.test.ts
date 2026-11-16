import { describe, expect, it } from "vitest";

import {
  encryptWalletSecret,
  decryptWalletSecret,
  redactSecrets,
  toPublicWalletConnection,
} from "@/server/crypto/wallet-secrets";

describe("wallet secret handling", () => {
  it("round-trips encryption without exposing plaintext in ciphertext fields", () => {
    const plaintext = "demo-nwc-placeholder://not-a-real-connection";
    const encrypted = encryptWalletSecret(plaintext);

    expect(encrypted.ciphertext).not.toContain("demo-nwc");
    expect(decryptWalletSecret(encrypted)).toBe(plaintext);
  });

  it("redacts secret-looking keys from API payloads", () => {
    const redacted = redactSecrets({
      id: "wc_1",
      label: "Demo",
      encryptedPayload: "cipher",
      encryptionIv: "iv",
      encryptionTag: "tag",
      nwcUri: "secret",
      nested: { apiKey: "x", ok: true },
    });

    expect(redacted.encryptedPayload).toBe("[REDACTED]");
    expect(redacted.encryptionIv).toBe("[REDACTED]");
    expect(redacted.encryptionTag).toBe("[REDACTED]");
    expect(redacted.nwcUri).toBe("[REDACTED]");
    expect(redacted.nested.apiKey).toBe("[REDACTED]");
    expect(redacted.nested.ok).toBe(true);
    expect(redacted.label).toBe("Demo");
  });

  it("strips credential fields from wallet connection DTOs", () => {
    const publicDto = toPublicWalletConnection({
      id: "wc_1",
      merchantId: "m_1",
      provider: "NWC",
      label: "Demo",
      status: "DISCONNECTED",
      encryptionKeyVersion: 1,
      lastCheckedAt: null,
      createdAt: new Date("2026-11-15T00:00:00.000Z"),
      updatedAt: new Date("2026-11-15T00:00:00.000Z"),
      encryptedPayload: "cipher-should-not-leak",
      encryptionIv: "iv-should-not-leak",
      encryptionTag: "tag-should-not-leak",
    });

    expect(publicDto).not.toHaveProperty("encryptedPayload");
    expect(publicDto).not.toHaveProperty("encryptionIv");
    expect(publicDto).not.toHaveProperty("encryptionTag");
    expect(JSON.stringify(publicDto)).not.toMatch(/cipher|iv-should|tag-should/);
  });
});
