import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  verifyEvent,
  type Event,
  type EventTemplate,
} from "nostr-tools/pure";
import { nip19 } from "nostr-tools";

import {
  RECEIPT_EVENT_KIND,
  integrityHashFromCanonicalJson,
} from "@/server/receipts/canonical";

export function generateMerchantSigningKeypair(): {
  secretKey: Uint8Array;
  pubkeyHex: string;
  npub: string;
} {
  const secretKey = generateSecretKey();
  const pubkeyHex = getPublicKey(secretKey);
  const npub = nip19.npubEncode(pubkeyHex);
  return { secretKey, pubkeyHex, npub };
}

export function secretKeyToHex(secretKey: Uint8Array): string {
  return Buffer.from(secretKey).toString("hex");
}

export function secretKeyFromHex(hex: string): Uint8Array {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("Invalid signing secret hex");
  }
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

export function npubFromPubkeyHex(pubkeyHex: string): string {
  return nip19.npubEncode(pubkeyHex);
}

/**
 * Build a minimal NIP-01 event attesting to a receipt integrity hash.
 * Content is the hash only — no names, phones, line items, or wallet data.
 */
export function buildReceiptAttestationTemplate(input: {
  publicId: string;
  integrityHash: string;
  currency: string;
  totalMinor: number;
  createdAt?: number;
}): EventTemplate {
  return {
    kind: RECEIPT_EVENT_KIND,
    created_at: input.createdAt ?? Math.floor(Date.now() / 1000),
    tags: [
      ["d", input.publicId],
      ["hash", input.integrityHash],
      ["currency", input.currency],
      ["amount", String(input.totalMinor)],
      ["client", "satspilot"],
    ],
    content: input.integrityHash,
  };
}

export function signReceiptAttestation(
  template: EventTemplate,
  secretKey: Uint8Array,
): Event {
  return finalizeEvent(template, secretKey);
}

export function verifyReceiptAttestation(event: Event): boolean {
  // Reconstruct a plain object so nostr-tools does not reuse a cached verify mark
  // (spreading a VerifiedEvent keeps the cache and would miss tampers).
  return verifyEvent({
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: event.kind,
    tags: event.tags,
    content: event.content,
    sig: event.sig,
  });
}

export function verifyReceiptBundle(input: {
  canonicalJson: string;
  event: Event;
}): {
  hashMatches: boolean;
  signatureValid: boolean;
  integrityHash: string;
  eventHashTag: string | null;
} {
  const integrityHash = integrityHashFromCanonicalJson(input.canonicalJson);
  const hashTag =
    input.event.tags.find((t) => t[0] === "hash")?.[1] ?? null;
  const hashMatches =
    integrityHash === input.event.content &&
    (hashTag == null || hashTag === integrityHash);
  const signatureValid = verifyReceiptAttestation(input.event);
  return { hashMatches, signatureValid, integrityHash, eventHashTag: hashTag };
}
