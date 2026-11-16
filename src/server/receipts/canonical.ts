import { createHash, randomBytes } from "node:crypto";

/**
 * Canonical receipt payload stored privately.
 * Intentionally omits: customer name/phone, balances, NWC credentials, wallet secrets.
 */
export type CanonicalReceiptLine = {
  n: string;
  q: number;
  u: number;
  t: number;
  c: string;
};

export type CanonicalReceipt = {
  v: 1;
  publicId: string;
  /** Opaque correlation only — not a customer identifier. */
  saleDigest: string;
  merchantPubkey: string;
  issuedAt: string;
  currency: string;
  totalMinor: number;
  lines: CanonicalReceiptLine[];
};

/** SatsPilot parameterized replaceable kind for minimal receipt attestations (NIP-33 range). */
export const RECEIPT_EVENT_KIND = 31234;

export function createPublicId(): string {
  return `rcp_${randomBytes(12).toString("hex")}`;
}

export function createAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export function saleDigest(saleId: string): string {
  return createHash("sha256").update(`sale:${saleId}`).digest("hex").slice(0, 32);
}

/**
 * Deterministic JSON: sorted object keys, stable arrays, no whitespace variance.
 * Used as the preimage for the integrity hash.
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortValue(obj[key]);
    }
    return out;
  }
  return value;
}

export function integrityHashFromCanonicalJson(canonicalJson: string): string {
  return createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

export function buildCanonicalReceipt(input: {
  publicId: string;
  saleId: string;
  merchantPubkey: string;
  issuedAt: Date;
  currency: string;
  totalMinor: number;
  lines: Array<{
    productName: string;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
    currency: string;
  }>;
}): CanonicalReceipt {
  return {
    v: 1,
    publicId: input.publicId,
    saleDigest: saleDigest(input.saleId),
    merchantPubkey: input.merchantPubkey,
    issuedAt: input.issuedAt.toISOString(),
    currency: input.currency,
    totalMinor: input.totalMinor,
    lines: input.lines.map((l) => ({
      n: l.productName,
      q: l.quantity,
      u: l.unitPriceMinor,
      t: l.lineTotalMinor,
      c: l.currency,
    })),
  };
}
