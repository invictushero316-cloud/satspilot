import "server-only";

import type { MembershipRole, Merchant, MerchantMembership } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { ForbiddenError, UnauthorizedError } from "@/server/errors";
import { merchantIdSchema } from "@/server/validation/merchant";

export type MerchantAccess = {
  userId: string;
  merchantId: string;
  role: MembershipRole;
  merchant: Merchant;
  membership: MerchantMembership;
};

/**
 * Resolve membership for the authenticated user.
 * A client-supplied merchantId alone is never sufficient proof of access.
 */
export async function requireMerchantMembership(
  userId: string | undefined | null,
  merchantIdInput: string,
): Promise<MerchantAccess> {
  if (!userId) {
    throw new UnauthorizedError();
  }

  const parsed = merchantIdSchema.safeParse(merchantIdInput);
  if (!parsed.success) {
    throw new ForbiddenError("Invalid merchant reference");
  }

  const merchantId = parsed.data;

  const membership = await prisma.merchantMembership.findUnique({
    where: {
      userId_merchantId: { userId, merchantId },
    },
    include: { merchant: true },
  });

  if (!membership || membership.merchant.status !== "ACTIVE") {
    throw new ForbiddenError();
  }

  return {
    userId,
    merchantId,
    role: membership.role,
    merchant: membership.merchant,
    membership,
  };
}

/** List merchants the user belongs to (never trusts client filters alone). */
export async function listAccessibleMerchants(userId: string) {
  const memberships = await prisma.merchantMembership.findMany({
    where: {
      userId,
      merchant: { status: "ACTIVE" },
    },
    include: { merchant: true },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((m) => m.merchant);
}

export async function assertMerchantAccess(
  userId: string,
  merchantId: string,
): Promise<void> {
  await requireMerchantMembership(userId, merchantId);
}
