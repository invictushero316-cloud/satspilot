import "server-only";

import { requireMerchantMembership } from "@/server/authz/merchant";
import {
  decryptWalletSecret,
  encryptWalletSecret,
  toPublicWalletConnection,
} from "@/server/crypto/wallet-secrets";
import { prisma } from "@/server/db/prisma";
import { AppError, ValidationError } from "@/server/errors";
import { createLightningProvider } from "@/server/lightning/factory";
import { assertReceiveCapabilities } from "@/server/lightning/types";
import { assertRateLimit } from "@/server/security/request-guards";
import { z } from "zod";

const connectSchema = z.object({
  merchantId: z.string().cuid(),
  /** NWC URI — accepted only at connection time; never returned afterward. */
  nwcUri: z
    .string()
    .trim()
    .min(20)
    .max(2000)
    .refine(
      (v) =>
        v.startsWith("nostr+walletconnect://") ||
        v.startsWith("nostrwalletconnect://") ||
        v.startsWith("mock://"),
      "NWC URI must use nostr+walletconnect://",
    ),
  label: z.string().trim().max(80).optional(),
});

export async function getPublicWalletStatus(
  userId: string,
  merchantId: string,
) {
  await requireMerchantMembership(userId, merchantId);
  const row = await prisma.walletConnection.findUnique({
    where: { merchantId },
  });
  if (!row) {
    return {
      connected: false,
      connection: null as ReturnType<typeof toPublicWalletConnection> | null,
      capabilities: [] as string[],
      includesPayInvoice: false,
      receiveOnlyRecommended: true,
      network: null as string | null,
      lud16: null as string | null,
      label: null as string | null,
    };
  }
  const capabilities = Array.isArray(row.capabilities)
    ? (row.capabilities as string[])
    : [];
  return {
    connected: row.status === "CONNECTED",
    connection: toPublicWalletConnection(row),
    capabilities,
    includesPayInvoice: row.includesPayInvoice,
    receiveOnlyRecommended: !row.includesPayInvoice,
    network: row.network,
    lud16: row.lud16,
    label: row.label,
  };
}

export async function connectNwcWallet(userId: string, input: unknown) {
  const parsed = connectSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Invalid wallet connection", parsed.error.issues);
  }
  const { merchantId, nwcUri, label } = parsed.data;
  await requireMerchantMembership(userId, merchantId);
  assertRateLimit(`wallet-connect:${userId}`, 5, 60_000, "Too many wallet connect attempts");
  assertRateLimit(`wallet-connect-m:${merchantId}`, 8, 60_000);

  const provider = createLightningProvider(nwcUri);
  try {
    const info = await provider.getInfo();
    const { includesPayInvoice } = assertReceiveCapabilities(info.methods);
    const encrypted = encryptWalletSecret(nwcUri);

    const row = await prisma.walletConnection.upsert({
      where: { merchantId },
      create: {
        merchantId,
        provider: "NWC",
        label: label ?? info.alias ?? "NWC wallet",
        status: "CONNECTED",
        capabilities: info.methods,
        network: info.network ?? null,
        lud16: info.lud16 ?? null,
        includesPayInvoice,
        encryptedPayload: encrypted.ciphertext,
        encryptionIv: encrypted.iv,
        encryptionTag: encrypted.tag,
        encryptionKeyVersion: encrypted.keyVersion,
        lastCheckedAt: new Date(),
      },
      update: {
        label: label ?? info.alias ?? "NWC wallet",
        status: "CONNECTED",
        capabilities: info.methods,
        network: info.network ?? null,
        lud16: info.lud16 ?? null,
        includesPayInvoice,
        encryptedPayload: encrypted.ciphertext,
        encryptionIv: encrypted.iv,
        encryptionTag: encrypted.tag,
        encryptionKeyVersion: encrypted.keyVersion,
        lastCheckedAt: new Date(),
      },
    });

    await prisma.auditEvent.create({
      data: {
        merchantId,
        actorUserId: userId,
        action: "wallet.connected",
        resourceType: "wallet_connection",
        resourceId: row.id,
        metadata: {
          methods: info.methods,
          includesPayInvoice,
          network: info.network,
          // Never store URI / secret in audit metadata.
        },
      },
    });

    return {
      connection: toPublicWalletConnection(row),
      capabilities: info.methods,
      includesPayInvoice,
      warning: includesPayInvoice
        ? "This connection also allows pay_invoice. Prefer a receive-only NWC app with only make_invoice and lookup_invoice."
        : null,
    };
  } finally {
    provider.close();
  }
}

export async function disconnectNwcWallet(
  userId: string,
  merchantId: string,
) {
  await requireMerchantMembership(userId, merchantId);
  const existing = await prisma.walletConnection.findUnique({
    where: { merchantId },
  });
  if (!existing) {
    throw new AppError("NOT_FOUND", "No wallet connection", 404);
  }
  await prisma.walletConnection.delete({ where: { merchantId } });
  await prisma.auditEvent.create({
    data: {
      merchantId,
      actorUserId: userId,
      action: "wallet.disconnected",
      resourceType: "wallet_connection",
      resourceId: existing.id,
      metadata: {},
    },
  });
  return { ok: true as const };
}

/** Server-only: decrypt URI and open a provider. Caller must close(). */
export async function openMerchantWalletProvider(
  userId: string,
  merchantId: string,
) {
  await requireMerchantMembership(userId, merchantId);
  const row = await prisma.walletConnection.findUnique({
    where: { merchantId },
  });
  if (!row || row.status !== "CONNECTED") {
    throw new AppError("WALLET_REQUIRED", "Connect an NWC wallet first", 400);
  }

  const uri = decryptWalletSecret({
    ciphertext: row.encryptedPayload,
    iv: row.encryptionIv,
    tag: row.encryptionTag,
    keyVersion: row.encryptionKeyVersion,
  });

  const capabilities = Array.isArray(row.capabilities)
    ? (row.capabilities as string[])
    : [];
  assertReceiveCapabilities(capabilities);

  return {
    provider: createLightningProvider(uri),
    connection: row,
  };
}
