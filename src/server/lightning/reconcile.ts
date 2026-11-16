import "server-only";

import { prisma } from "@/server/db/prisma";
import { lookupLightningPaymentStatus } from "@/server/services/lightning";
import { allowRateLimited } from "@/server/lightning/rate-limit";

/**
 * Resume pending Lightning invoices after process restart / browser reload.
 * Persisted Payment rows + lookup_invoice are the source of truth — never the client.
 */
export async function reconcilePendingLightningPayments(input: {
  userId: string;
  merchantId: string;
  limit?: number;
}): Promise<{
  checked: number;
  settled: number;
  pending: number;
  errors: number;
}> {
  if (
    !allowRateLimited(`reconcile:${input.merchantId}`, 1, 15_000)
  ) {
    return { checked: 0, settled: 0, pending: 0, errors: 0 };
  }

  const pending = await prisma.payment.findMany({
    where: {
      merchantId: input.merchantId,
      method: "LIGHTNING",
      status: { in: ["PENDING", "UNKNOWN"] },
    },
    orderBy: { createdAt: "asc" },
    take: input.limit ?? 20,
  });

  let settled = 0;
  let stillPending = 0;
  let errors = 0;

  for (const payment of pending) {
    try {
      const result = await lookupLightningPaymentStatus(
        input.userId,
        input.merchantId,
        payment.id,
      );
      if (result.verified || result.status === "settled") {
        settled += 1;
      } else if (
        result.status === "pending" ||
        result.status === "unknown"
      ) {
        stillPending += 1;
      }
    } catch {
      errors += 1;
    }
  }

  return {
    checked: pending.length,
    settled,
    pending: stillPending,
    errors,
  };
}
