import "server-only";

import {
  encryptWalletSecret,
  decryptWalletSecret,
} from "@/server/crypto/wallet-secrets";
import { prisma } from "@/server/db/prisma";
import { requireMerchantMembership } from "@/server/authz/merchant";
import {
  generateMerchantSigningKeypair,
  npubFromPubkeyHex,
  secretKeyFromHex,
  secretKeyToHex,
} from "@/server/receipts/crypto";

/**
 * Ensure a server-managed signing identity exists for the merchant.
 * Never accepts a pasted nsec from the client.
 */
export async function ensureMerchantSigningIdentity(
  userId: string,
  merchantId: string,
) {
  await requireMerchantMembership(userId, merchantId);

  const existing = await prisma.merchantSigningIdentity.findUnique({
    where: { merchantId },
  });
  if (existing) {
    return {
      id: existing.id,
      merchantId,
      pubkeyHex: existing.pubkeyHex,
      npub: npubFromPubkeyHex(existing.pubkeyHex),
      created: false,
    };
  }

  const { secretKey, pubkeyHex, npub } = generateMerchantSigningKeypair();
  const encrypted = encryptWalletSecret(secretKeyToHex(secretKey));

  const row = await prisma.merchantSigningIdentity.create({
    data: {
      merchantId,
      pubkeyHex,
      encryptedSecret: encrypted.ciphertext,
      encryptionIv: encrypted.iv,
      encryptionTag: encrypted.tag,
      encryptionKeyVersion: encrypted.keyVersion,
    },
  });

  await prisma.auditEvent.create({
    data: {
      merchantId,
      actorUserId: userId,
      action: "receipt.signing_identity_created",
      resourceType: "merchant_signing_identity",
      resourceId: row.id,
      metadata: { pubkeyHex, npub },
    },
  });

  return {
    id: row.id,
    merchantId,
    pubkeyHex,
    npub,
    created: true,
  };
}

export async function getMerchantSigningPublic(
  userId: string,
  merchantId: string,
) {
  await requireMerchantMembership(userId, merchantId);
  const row = await prisma.merchantSigningIdentity.findUnique({
    where: { merchantId },
  });
  if (!row) return null;
  return {
    pubkeyHex: row.pubkeyHex,
    npub: npubFromPubkeyHex(row.pubkeyHex),
  };
}

/** Server-only: decrypt signing secret for attestation. Caller must not log/export. */
export async function loadMerchantSecretKey(merchantId: string): Promise<{
  secretKey: Uint8Array;
  pubkeyHex: string;
}> {
  const row = await prisma.merchantSigningIdentity.findUnique({
    where: { merchantId },
  });
  if (!row) {
    throw new Error("Merchant signing identity missing");
  }
  const hex = decryptWalletSecret({
    ciphertext: row.encryptedSecret,
    iv: row.encryptionIv,
    tag: row.encryptionTag,
    keyVersion: row.encryptionKeyVersion,
  });
  return { secretKey: secretKeyFromHex(hex), pubkeyHex: row.pubkeyHex };
}
