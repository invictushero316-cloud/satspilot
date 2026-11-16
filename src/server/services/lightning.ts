import "server-only";

import { Prisma } from "@prisma/client";

import { requireMerchantMembership } from "@/server/authz/merchant";
import { applySalePayment } from "@/server/bookkeeping/money-math";
import { bookkeepingIdempotency } from "@/server/bookkeeping/idempotency";
import { prisma } from "@/server/db/prisma";
import { AppError, ValidationError } from "@/server/errors";
import { allowRateLimited } from "@/server/lightning/rate-limit";
import { verifyIncomingSettlement } from "@/server/lightning/settlement";
import type { LightningTransaction } from "@/server/lightning/types";
import { openMerchantWalletProvider } from "@/server/services/wallet";
import { createReceiptForSale } from "@/server/receipts/service";
import { z } from "zod";

export { verifyIncomingSettlement } from "@/server/lightning/settlement";

const createInvoiceSchema = z.object({
  merchantId: z.string().cuid(),
  amountSats: z.number().int().positive().max(1_000_000),
  description: z.string().trim().max(200).optional(),
  saleId: z.string().cuid().optional(),
  idempotencyKey: z.string().trim().min(8).max(120),
  expirySeconds: z.number().int().positive().max(86_400).default(900),
});

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function satsToMsats(sats: number): number {
  const msats = sats * 1000;
  if (!Number.isSafeInteger(msats)) {
    throw new ValidationError("Amount too large");
  }
  return msats;
}

function mapProviderStateToPaymentStatus(
  tx: LightningTransaction,
  now = new Date(),
): "PENDING" | "SETTLED" | "EXPIRED" | "FAILED" | "UNKNOWN" {
  if (tx.state === "settled") return "SETTLED";
  if (tx.state === "failed") return "FAILED";
  if (tx.state === "expired") return "EXPIRED";
  if (tx.state === "pending" || tx.state === "accepted") {
    if (tx.expiresAt && tx.expiresAt * 1000 < now.getTime()) {
      return "EXPIRED";
    }
    return "PENDING";
  }
  return "UNKNOWN";
}

function toPublicInvoice(payment: {
  id: string;
  merchantId: string;
  saleId: string | null;
  status: string;
  amountSats: number | null;
  amountMsats: bigint | null;
  bolt11: string | null;
  paymentHash: string | null;
  expiresAt: Date | null;
  settledAt: Date | null;
  createdAt: Date;
  description: string | null;
}) {
  return {
    paymentId: payment.id,
    saleId: payment.saleId,
    status: payment.status.toLowerCase(),
    amountSats: payment.amountSats,
    amountMsats:
      payment.amountMsats == null ? null : Number(payment.amountMsats),
    bolt11: payment.bolt11,
    paymentHash: payment.paymentHash,
    expiresAt: payment.expiresAt?.toISOString() ?? null,
    settledAt: payment.settledAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    description: payment.description,
  };
}

export async function createLightningInvoice(userId: string, input: unknown) {
  const parsed = createInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Invalid invoice request", parsed.error.issues);
  }
  const data = parsed.data;
  await requireMerchantMembership(userId, data.merchantId);

  return bookkeepingIdempotency.run(
    `ln-invoice:${data.idempotencyKey}`,
    async () => {
      const existing = await prisma.payment.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existing) {
        if (existing.merchantId !== data.merchantId) {
          throw new AppError("CONFLICT", "Idempotency key conflict", 409);
        }
        return toPublicInvoice(existing);
      }

      const amountMsats = satsToMsats(data.amountSats);

      let saleId = data.saleId ?? null;
      if (saleId) {
        const sale = await prisma.sale.findFirst({
          where: { id: saleId, merchantId: data.merchantId },
        });
        if (!sale || sale.status !== "FINALIZED") {
          throw new ValidationError("Sale not found");
        }
        if (sale.currency !== "SAT") {
          throw new ValidationError(
            "Lightning invoices attach only to SAT-denominated sales in this MVP",
          );
        }
        if (sale.totalMinor !== data.amountSats) {
          throw new ValidationError(
            "Invoice amount must match the SAT sale total exactly",
          );
        }
        if (sale.paymentState === "PAID") {
          throw new ValidationError("Sale is already paid");
        }
      } else {
        const sale = await prisma.sale.create({
          data: {
            merchantId: data.merchantId,
            status: "FINALIZED",
            paymentState: "UNPAID",
            currency: "SAT",
            totalMinor: data.amountSats,
            amountPaidMinor: 0,
            paymentMethod: "LIGHTNING",
            idempotencyKey: `${data.idempotencyKey}:sale`,
            notes: data.description,
            finalizedAt: new Date(),
            items: {
              create: [
                {
                  productName: data.description?.trim() || "Lightning sale",
                  quantity: 1,
                  unitPriceMinor: data.amountSats,
                  lineTotalMinor: data.amountSats,
                  currency: "SAT",
                },
              ],
            },
          },
        });
        saleId = sale.id;
      }

      const { provider } = await openMerchantWalletProvider(
        userId,
        data.merchantId,
      );

      try {
        const invoice = await Promise.race([
          provider.makeInvoice({
            amountMsats,
            description: data.description ?? `SatsPilot sale ${saleId}`,
            expirySeconds: data.expirySeconds,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("make_invoice timeout")),
              20_000,
            ),
          ),
        ]);

        if (invoice.type !== "incoming") {
          throw new AppError(
            "PROVIDER_ERROR",
            "Wallet returned a non-incoming invoice",
            502,
          );
        }
        if (invoice.amountMsats !== amountMsats) {
          throw new AppError(
            "AMOUNT_MISMATCH",
            "Wallet invoice amount does not match requested amount",
            502,
          );
        }

        const expiresAt = invoice.expiresAt
          ? new Date(invoice.expiresAt * 1000)
          : new Date(Date.now() + data.expirySeconds * 1000);

        try {
          const payment = await prisma.payment.create({
            data: {
              merchantId: data.merchantId,
              saleId,
              status: "PENDING",
              kind: "SALE_PAYMENT",
              method: "LIGHTNING",
              description: data.description ?? "Lightning invoice",
              amountSats: data.amountSats,
              amountMsats: BigInt(amountMsats),
              expectedAmountMsats: BigInt(amountMsats),
              bolt11: invoice.invoice,
              paymentHash: invoice.paymentHash,
              expiresAt,
              idempotencyKey: data.idempotencyKey,
            },
          });

          await prisma.auditEvent.create({
            data: {
              merchantId: data.merchantId,
              actorUserId: userId,
              action: "lightning.invoice_created",
              resourceType: "payment",
              resourceId: payment.id,
              metadata: {
                amountSats: data.amountSats,
                paymentHash: invoice.paymentHash,
                saleId,
              },
            },
          });

          if (saleId) {
            await createReceiptForSale(userId, saleId);
          }

          return toPublicInvoice(payment);
        } catch (error) {
          if (isUniqueViolation(error)) {
            const again = await prisma.payment.findUnique({
              where: { idempotencyKey: data.idempotencyKey },
            });
            if (again && again.merchantId === data.merchantId) {
              return toPublicInvoice(again);
            }
          }
          throw error;
        }
      } finally {
        provider.close();
      }
    },
  );
}

export async function lookupLightningPaymentStatus(
  userId: string,
  merchantId: string,
  paymentId: string,
) {
  await requireMerchantMembership(userId, merchantId);

  if (!allowRateLimited(`poll:${merchantId}:${paymentId}`, 1, 2000)) {
    throw new AppError("RATE_LIMITED", "Polling too frequently", 429);
  }
  if (!allowRateLimited(`poll-merchant:${merchantId}`, 30, 60_000)) {
    throw new AppError("RATE_LIMITED", "Too many payment polls", 429);
  }

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, merchantId, method: "LIGHTNING" },
    include: { sale: true },
  });
  if (!payment) {
    throw new AppError("NOT_FOUND", "Payment not found", 404);
  }

  if (payment.status === "SETTLED") {
    return {
      ...toPublicInvoice(payment),
      verified: true,
      providerState: "settled" as const,
    };
  }

  if (payment.status === "EXPIRED" || payment.status === "FAILED") {
    return {
      ...toPublicInvoice(payment),
      verified: false,
      providerState: payment.status.toLowerCase(),
    };
  }

  if (payment.expiresAt && payment.expiresAt.getTime() < Date.now()) {
    const expired = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "EXPIRED", lastLookupAt: new Date() },
    });
    return {
      ...toPublicInvoice(expired),
      verified: false,
      providerState: "expired" as const,
    };
  }

  const { provider } = await openMerchantWalletProvider(userId, merchantId);
  try {
    const tx = await Promise.race([
      provider.lookupInvoice({
        paymentHash: payment.paymentHash ?? undefined,
        invoice: payment.bolt11 ?? undefined,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("lookup_invoice timeout")), 12_000),
      ),
    ]);

    await prisma.payment.update({
      where: { id: payment.id },
      data: { lastLookupAt: new Date() },
    });

    const mapped = mapProviderStateToPaymentStatus(tx);

    if (mapped === "SETTLED") {
      const expected = Number(payment.expectedAmountMsats ?? 0);
      const check = verifyIncomingSettlement({
        expectedAmountMsats: expected,
        expectedPaymentHash: payment.paymentHash ?? "",
        tx,
      });
      if (!check.ok) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "UNKNOWN" },
        });
        throw new AppError("SETTLEMENT_REJECTED", check.reason, 409);
      }

      const settled = await settleLightningPaymentVerified(userId, payment.id, tx);
      return {
        ...settled,
        verified: true,
        providerState: "settled" as const,
      };
    }

    if (mapped === "EXPIRED" || mapped === "FAILED" || mapped === "UNKNOWN") {
      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: { status: mapped },
      });
      return {
        ...toPublicInvoice(updated),
        verified: false,
        providerState: mapped.toLowerCase(),
      };
    }

    return {
      ...toPublicInvoice(payment),
      verified: false,
      providerState: "pending" as const,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "UNKNOWN", lastLookupAt: new Date() },
    });
    throw new AppError(
      "PROVIDER_ERROR",
      error instanceof Error ? error.message : "lookup_invoice failed",
      502,
    );
  } finally {
    provider.close();
  }
}

async function settleLightningPaymentVerified(
  userId: string,
  paymentId: string,
  tx: LightningTransaction,
) {
  return prisma.$transaction(async (db) => {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { sale: true },
    });
    if (!payment) {
      throw new AppError("NOT_FOUND", "Payment not found", 404);
    }
    if (payment.status === "SETTLED") {
      return toPublicInvoice(payment);
    }

    // Idempotent claim: only one concurrent worker can flip unsettled→SETTLED.
    const claimed = await db.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: ["PENDING", "UNKNOWN"] },
      },
      data: {
        status: "SETTLED",
        settledAt: tx.settledAt ? new Date(tx.settledAt * 1000) : new Date(),
        lastLookupAt: new Date(),
      },
    });

    if (claimed.count === 0) {
      const again = await db.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });
      return toPublicInvoice(again);
    }

    const updated = await db.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });

    if (payment.saleId && payment.sale && payment.amountSats != null) {
      // Re-read sale inside the transaction to avoid stale amountPaid races.
      const sale = await db.sale.findUniqueOrThrow({
        where: { id: payment.saleId },
      });
      if (sale.paymentState !== "PAID") {
        const next = applySalePayment(
          sale.totalMinor,
          sale.amountPaidMinor,
          payment.amountSats,
        );
        await db.sale.update({
          where: { id: sale.id },
          data: {
            amountPaidMinor: next.amountPaidMinor,
            paymentState: next.paymentState,
          },
        });
      }
    }

    await db.auditEvent.create({
      data: {
        merchantId: payment.merchantId,
        actorUserId: userId,
        action: "lightning.payment_settled",
        resourceType: "payment",
        resourceId: payment.id,
        metadata: {
          paymentHash: payment.paymentHash,
          amountMsats: Number(payment.expectedAmountMsats ?? 0),
          direction: "incoming",
        },
      },
    });

    return toPublicInvoice(updated);
  });
}

export async function getLightningPaymentForResume(
  userId: string,
  merchantId: string,
  paymentId: string,
) {
  await requireMerchantMembership(userId, merchantId);
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, merchantId, method: "LIGHTNING" },
  });
  if (!payment) {
    throw new AppError("NOT_FOUND", "Payment not found", 404);
  }
  return toPublicInvoice(payment);
}
