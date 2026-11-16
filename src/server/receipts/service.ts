import "server-only";

import type { Event } from "nostr-tools/pure";

import { requireMerchantMembership } from "@/server/authz/merchant";
import { prisma } from "@/server/db/prisma";
import { withDatabase } from "@/server/db/safe";
import { AppError, ValidationError } from "@/server/errors";
import {
  buildCanonicalReceipt,
  canonicalize,
  createAccessToken,
  createPublicId,
  integrityHashFromCanonicalJson,
} from "@/server/receipts/canonical";
import {
  buildReceiptAttestationTemplate,
  npubFromPubkeyHex,
  signReceiptAttestation,
  verifyReceiptBundle,
} from "@/server/receipts/crypto";
import {
  defaultReceiptRelayUrl,
  publishReceiptEvent,
} from "@/server/receipts/publish";
import {
  ensureMerchantSigningIdentity,
  loadMerchantSecretKey,
} from "@/server/receipts/signing-identity";

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function receiptCustomerUrl(accessToken: string): string {
  return `${appBaseUrl()}/r/${accessToken}`;
}

export function receiptVerifyUrl(publicId: string): string {
  return `${appBaseUrl()}/verify/${publicId}`;
}

function parseEvent(json: string): Event {
  return JSON.parse(json) as Event;
}

function paymentStatusFromSale(sale: {
  paymentState: string;
  amountPaidMinor: number;
  totalMinor: number;
  payments: Array<{
    status: string;
    method: string;
    amountFiatMinor: number | null;
    amountSats: number | null;
    settledAt: Date | null;
  }>;
}): {
  paymentState: string;
  amountPaidMinor: number;
  totalMinor: number;
  settledPayments: Array<{
    method: string;
    status: string;
    amountFiatMinor: number | null;
    amountSats: number | null;
    settledAt: string | null;
  }>;
  /** Explicit: integrity ≠ Lightning proof */
  settlementNote: string;
} {
  return {
    paymentState: sale.paymentState,
    amountPaidMinor: sale.amountPaidMinor,
    totalMinor: sale.totalMinor,
    settledPayments: sale.payments
      .filter((p) => p.status === "SETTLED")
      .map((p) => ({
        method: p.method,
        status: p.status,
        amountFiatMinor: p.amountFiatMinor,
        amountSats: p.amountSats,
        settledAt: p.settledAt?.toISOString() ?? null,
      })),
    settlementNote:
      "Receipt signature proves merchant attestation of the receipt hash. It does not independently prove Lightning settlement — payment status comes from SatsPilot's backend settlement records.",
  };
}

/**
 * Create (or return existing) signed receipt for a finalized sale.
 * Idempotent per saleId.
 */
export async function createReceiptForSale(
  userId: string,
  saleId: string,
) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true, payments: true, merchant: true },
  });
  if (!sale || sale.status !== "FINALIZED") {
    throw new AppError("NOT_FOUND", "Finalized sale not found", 404);
  }
  await requireMerchantMembership(userId, sale.merchantId);

  const existing = await prisma.receipt.findUnique({
    where: { saleId },
  });
  if (existing) {
    return toMerchantReceiptDto(existing, sale);
  }

  await ensureMerchantSigningIdentity(userId, sale.merchantId);
  const { secretKey, pubkeyHex } = await loadMerchantSecretKey(sale.merchantId);

  const publicId = createPublicId();
  const accessToken = createAccessToken();
  const issuedAt = new Date();
  const canonical = buildCanonicalReceipt({
    publicId,
    saleId: sale.id,
    merchantPubkey: pubkeyHex,
    issuedAt,
    currency: sale.currency,
    totalMinor: sale.totalMinor,
    lines: sale.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor: item.lineTotalMinor,
      currency: item.currency,
    })),
  });
  const canonicalJson = canonicalize(canonical);
  const integrityHash = integrityHashFromCanonicalJson(canonicalJson);

  const template = buildReceiptAttestationTemplate({
    publicId,
    integrityHash,
    currency: sale.currency,
    totalMinor: sale.totalMinor,
    createdAt: Math.floor(issuedAt.getTime() / 1000),
  });
  const event = signReceiptAttestation(template, secretKey);

  const receipt = await prisma.receipt.create({
    data: {
      publicId,
      accessToken,
      merchantId: sale.merchantId,
      saleId: sale.id,
      canonicalJson,
      integrityHash,
      pubkeyHex,
      signedEventJson: JSON.stringify(event),
      eventId: event.id,
      currency: sale.currency,
      totalMinor: sale.totalMinor,
      issuedAt,
    },
  });

  await prisma.auditEvent.create({
    data: {
      merchantId: sale.merchantId,
      actorUserId: userId,
      action: "receipt.created",
      resourceType: "receipt",
      resourceId: receipt.id,
      metadata: {
        publicId,
        eventId: event.id,
        integrityHash,
        // never store accessToken in audit
      },
    },
  });

  return toMerchantReceiptDto(receipt, sale);
}

async function loadSaleForReceipt(saleId: string) {
  return prisma.sale.findUniqueOrThrow({
    where: { id: saleId },
    include: { items: true, payments: true, merchant: true },
  });
}

function toMerchantReceiptDto(
  receipt: {
    id: string;
    publicId: string;
    accessToken: string;
    merchantId: string;
    saleId: string;
    integrityHash: string;
    pubkeyHex: string;
    signedEventJson: string;
    eventId: string;
    currency: string;
    totalMinor: number;
    issuedAt: Date;
    publishedToRelay: boolean;
    publishedAt: Date | null;
    publishedRelay: string | null;
    canonicalJson: string;
  },
  sale: Awaited<ReturnType<typeof loadSaleForReceipt>>,
) {
  const event = parseEvent(receipt.signedEventJson);
  const verification = verifyReceiptBundle({
    canonicalJson: receipt.canonicalJson,
    event,
  });
  const payment = paymentStatusFromSale(sale);

  return {
    id: receipt.id,
    publicId: receipt.publicId,
    saleId: receipt.saleId,
    merchantId: receipt.merchantId,
    merchantName: sale.merchant.name,
    customerUrl: receiptCustomerUrl(receipt.accessToken),
    verifyUrl: receiptVerifyUrl(receipt.publicId),
    integrityHash: receipt.integrityHash,
    eventId: receipt.eventId,
    pubkeyHex: receipt.pubkeyHex,
    npub: npubFromPubkeyHex(receipt.pubkeyHex),
    currency: receipt.currency,
    totalMinor: receipt.totalMinor,
    issuedAt: receipt.issuedAt.toISOString(),
    publishedToRelay: receipt.publishedToRelay,
    publishedAt: receipt.publishedAt?.toISOString() ?? null,
    publishedRelay: receipt.publishedRelay,
    verification: {
      signatureValid: verification.signatureValid,
      hashMatches: verification.hashMatches,
    },
    lines: sale.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
      unitPriceMinor: i.unitPriceMinor,
      lineTotalMinor: i.lineTotalMinor,
      currency: i.currency,
    })),
    payment,
    /** What a third party with only the Nostr event can check */
    thirdPartyCanVerify: [
      "NIP-01 event id and schnorr signature over the minimal attestation",
      "That the signer pubkey matches the merchant receipt identity",
      "That the attested integrity hash equals the event content/hash tag",
    ],
    thirdPartyCannotVerify: [
      "Customer name, phone, or outstanding balances (never included)",
      "Line-item product details from the public event alone",
      "Lightning settlement independently of SatsPilot backend records",
      "NWC credentials or wallet secrets (never included)",
    ],
  };
}

export async function getReceiptForMerchant(
  userId: string,
  merchantId: string,
  saleId: string,
) {
  await requireMerchantMembership(userId, merchantId);
  const receipt = await prisma.receipt.findFirst({
    where: { saleId, merchantId },
  });
  if (!receipt) {
    throw new AppError("NOT_FOUND", "Receipt not found", 404);
  }
  const sale = await loadSaleForReceipt(saleId);
  return toMerchantReceiptDto(receipt, sale);
}

/** Customer-facing view via unguessable access token (no login). */
export async function getReceiptByAccessToken(accessToken: string) {
  const receipt = await prisma.receipt.findUnique({
    where: { accessToken },
  });
  if (!receipt) {
    throw new AppError("NOT_FOUND", "Receipt not found", 404);
  }
  const sale = await loadSaleForReceipt(receipt.saleId);
  const event = parseEvent(receipt.signedEventJson);
  const verification = verifyReceiptBundle({
    canonicalJson: receipt.canonicalJson,
    event,
  });
  const payment = paymentStatusFromSale(sale);

  return {
    publicId: receipt.publicId,
    merchantName: sale.merchant.name,
    issuedAt: receipt.issuedAt.toISOString(),
    currency: receipt.currency,
    totalMinor: receipt.totalMinor,
    lines: sale.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
      unitPriceMinor: i.unitPriceMinor,
      lineTotalMinor: i.lineTotalMinor,
      currency: i.currency,
    })),
    // No customer name/phone/balances
    payment,
    verification: {
      signatureValid: verification.signatureValid,
      hashMatches: verification.hashMatches,
      integrityHash: receipt.integrityHash,
      npub: npubFromPubkeyHex(receipt.pubkeyHex),
      eventId: receipt.eventId,
    },
    verifyUrl: receiptVerifyUrl(receipt.publicId),
    customerUrl: receiptCustomerUrl(receipt.accessToken),
    privacyNote:
      "This link is private to holders of the receipt token. It does not include customer phone numbers or account balances.",
    settlementDisclaimer: payment.settlementNote,
  };
}

/**
 * Public verification by publicId — no line items, no customer data.
 * Suitable for third-party checks of signature + hash attestation.
 */
export async function getPublicVerification(publicId: string) {
  const receipt = await withDatabase(() =>
    prisma.receipt.findUnique({
      where: { publicId },
    }),
  );
  if (!receipt) {
    throw new AppError("NOT_FOUND", "Receipt not found", 404);
  }
  const sale = await withDatabase(() => loadSaleForReceipt(receipt.saleId));
  const event = parseEvent(receipt.signedEventJson);
  const verification = verifyReceiptBundle({
    canonicalJson: receipt.canonicalJson,
    event,
  });
  const payment = paymentStatusFromSale(sale);

  return {
    publicId: receipt.publicId,
    integrityHash: receipt.integrityHash,
    currency: receipt.currency,
    totalMinor: receipt.totalMinor,
    issuedAt: receipt.issuedAt.toISOString(),
    npub: npubFromPubkeyHex(receipt.pubkeyHex),
    pubkeyHex: receipt.pubkeyHex,
    eventId: receipt.eventId,
    event: {
      id: event.id,
      pubkey: event.pubkey,
      kind: event.kind,
      created_at: event.created_at,
      tags: event.tags,
      content: event.content,
      sig: event.sig,
    },
    verification: {
      signatureValid: verification.signatureValid,
      hashMatches: verification.hashMatches,
    },
    payment: {
      paymentState: payment.paymentState,
      amountPaidMinor: payment.amountPaidMinor,
      totalMinor: payment.totalMinor,
      settlementNote: payment.settlementNote,
    },
    publishedToRelay: receipt.publishedToRelay,
    publishedRelay: receipt.publishedRelay,
    thirdPartyCanVerify: [
      "Event signature (NIP-01)",
      "Integrity hash commitment in content/tags",
      "Backend-reported payment state for this receipt (not proven by the signature alone)",
    ],
    thirdPartyCannotSee: [
      "Customer personal data",
      "Line items (not on this public screen)",
      "NWC / wallet credentials",
    ],
  };
}

export async function setNostrPublishOptIn(
  userId: string,
  merchantId: string,
  optIn: boolean,
) {
  await requireMerchantMembership(userId, merchantId);
  const merchant = await prisma.merchant.update({
    where: { id: merchantId },
    data: { nostrPublishOptIn: optIn },
  });
  await prisma.auditEvent.create({
    data: {
      merchantId,
      actorUserId: userId,
      action: optIn ? "receipt.nostr_opt_in" : "receipt.nostr_opt_out",
      resourceType: "merchant",
      resourceId: merchantId,
      metadata: {},
    },
  });
  return { nostrPublishOptIn: merchant.nostrPublishOptIn };
}

export async function publishReceiptToRelay(
  userId: string,
  merchantId: string,
  saleId: string,
  relayUrl?: string,
) {
  await requireMerchantMembership(userId, merchantId);
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
  });
  if (!merchant?.nostrPublishOptIn) {
    throw new AppError(
      "OPT_IN_REQUIRED",
      "Merchant must explicitly opt in to public relay publication",
      403,
    );
  }

  const receipt = await prisma.receipt.findFirst({
    where: { saleId, merchantId },
  });
  if (!receipt) {
    throw new AppError("NOT_FOUND", "Receipt not found", 404);
  }

  // Idempotent: already published with same event id.
  if (receipt.publishedToRelay && receipt.publishedRelay) {
    return {
      published: true,
      duplicate: true,
      eventId: receipt.eventId,
      relayUrl: receipt.publishedRelay,
    };
  }

  const event = parseEvent(receipt.signedEventJson);
  const target = relayUrl?.trim() || defaultReceiptRelayUrl();
  const result = await publishReceiptEvent({ event, relayUrl: target });
  if (!result.ok) {
    throw new AppError("RELAY_ERROR", result.error, 502);
  }

  const updated = await prisma.receipt.update({
    where: { id: receipt.id },
    data: {
      publishedToRelay: true,
      publishedAt: new Date(),
      publishedRelay: result.relayUrl,
    },
  });

  await prisma.auditEvent.create({
    data: {
      merchantId,
      actorUserId: userId,
      action: "receipt.published",
      resourceType: "receipt",
      resourceId: receipt.id,
      metadata: {
        eventId: receipt.eventId,
        relayUrl: result.relayUrl,
      },
    },
  });

  return {
    published: true,
    duplicate: false,
    eventId: updated.eventId,
    relayUrl: updated.publishedRelay,
  };
}

export async function ensureReceiptAfterSale(
  userId: string,
  saleId: string,
) {
  try {
    return await createReceiptForSale(userId, saleId);
  } catch (error) {
    // Don't fail the sale path hard in production if signing key missing —
    // but ValidationError / auth should surface.
    if (error instanceof AppError) throw error;
    throw new ValidationError(
      error instanceof Error ? error.message : "Receipt creation failed",
    );
  }
}
