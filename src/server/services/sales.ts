import "server-only";

import { Prisma } from "@prisma/client";

import { requireMerchantMembership } from "@/server/authz/merchant";
import {
  applySalePayment,
  computeSaleTotals,
  saleBalanceDue,
} from "@/server/bookkeeping/money-math";
import { bookkeepingIdempotency } from "@/server/bookkeeping/idempotency";
import { prisma } from "@/server/db/prisma";
import { AppError, ValidationError } from "@/server/errors";
import {
  createSaleSchema,
  historyFilterSchema,
  salePaymentSchema,
} from "@/server/validation/bookkeeping";

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createFinalizedSale(userId: string, input: unknown) {
  const parsed = createSaleSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Invalid sale", parsed.error.issues);
  }
  const data = parsed.data;
  await requireMerchantMembership(userId, data.merchantId);

  return bookkeepingIdempotency.run(`sale:${data.idempotencyKey}`, async () => {
    const existing = await prisma.sale.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
      include: { items: true, payments: true, customer: true },
    });
    if (existing) {
      if (existing.merchantId !== data.merchantId) {
        throw new AppError("CONFLICT", "Idempotency key conflict", 409);
      }
      return existing;
    }

    if (data.paymentMethod === "CREDIT" && !data.customerId) {
      throw new ValidationError("Credit sales require a customer");
    }
    if (data.paymentMethod === "CASH" && data.cashPaidMinor < 0) {
      throw new ValidationError("cashPaidMinor must be non-negative");
    }

    const { lines, totalMinor } = computeSaleTotals(data.lines, data.currency);

    if (data.cashPaidMinor > totalMinor) {
      throw new ValidationError("Cash paid cannot exceed sale total");
    }

    if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: {
          id: data.customerId,
          merchantId: data.merchantId,
          status: "ACTIVE",
        },
      });
      if (!customer) {
        throw new ValidationError("Customer not found for this merchant");
      }
    }

    // Validate products + currencies + stock before writing.
    for (const line of lines) {
      if (!line.productId) continue;
      const product = await prisma.product.findFirst({
        where: {
          id: line.productId,
          merchantId: data.merchantId,
          status: "ACTIVE",
        },
      });
      if (!product) {
        throw new ValidationError(`Product not found: ${line.productId}`);
      }
      if (product.currency !== data.currency) {
        throw new ValidationError(
          `Product ${product.name} currency ${product.currency} does not match sale currency`,
        );
      }
      if (line.currency !== product.currency) {
        throw new ValidationError("Line currency must match product currency");
      }
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const now = new Date();
        const initialPaid = data.cashPaidMinor;
        const paymentState =
          initialPaid === 0
            ? "UNPAID"
            : initialPaid === totalMinor
              ? "PAID"
              : "PARTIALLY_PAID";

        const sale = await tx.sale.create({
          data: {
            merchantId: data.merchantId,
            customerId: data.customerId ?? null,
            status: "FINALIZED",
            paymentState,
            currency: data.currency,
            totalMinor,
            amountPaidMinor: initialPaid,
            paymentMethod: data.paymentMethod,
            idempotencyKey: data.idempotencyKey,
            notes: data.notes,
            finalizedAt: now,
            items: {
              create: lines.map((line) => ({
                productId: line.productId ?? null,
                productName: line.productName,
                quantity: line.quantity,
                unitPriceMinor: line.unitPriceMinor,
                lineTotalMinor: line.lineTotalMinor,
                currency: line.currency,
              })),
            },
          },
          include: { items: true, payments: true, customer: true },
        });

        // Decrement stock when tracked.
        for (const line of lines) {
          if (!line.productId) continue;
          const product = await tx.product.findUnique({
            where: { id: line.productId },
          });
          if (!product?.trackStock) continue;
          const onHand = product.stockOnHand ?? 0;
          if (onHand < line.quantity) {
            throw new ValidationError(
              `Insufficient stock for ${product.name}`,
            );
          }
          await tx.product.update({
            where: { id: product.id },
            data: { stockOnHand: onHand - line.quantity },
          });
        }

        if (initialPaid > 0) {
          await tx.payment.create({
            data: {
              merchantId: data.merchantId,
              saleId: sale.id,
              customerId: data.customerId ?? null,
              status: "SETTLED",
              kind: "SALE_PAYMENT",
              method: "CASH",
              description: "Cash at sale",
              amountFiatMinor: initialPaid,
              fiatCurrency: data.currency,
              idempotencyKey: `${data.idempotencyKey}:cash`,
              settledAt: now,
            },
          });
        }

        const unpaid = saleBalanceDue(totalMinor, initialPaid);
        if (unpaid > 0) {
          if (!data.customerId) {
            throw new ValidationError(
              "Unpaid amount requires a customer for the tab/ledger",
            );
          }
          await tx.customerLedgerEntry.create({
            data: {
              merchantId: data.merchantId,
              customerId: data.customerId,
              entryType: "DEBIT",
              amountMinor: unpaid,
              currency: data.currency,
              relatedSaleId: sale.id,
              note: "Sale balance on account",
            },
          });
        }

        await tx.auditEvent.create({
          data: {
            merchantId: data.merchantId,
            actorUserId: userId,
            action: "sale.finalized",
            resourceType: "sale",
            resourceId: sale.id,
            metadata: {
              totalMinor,
              amountPaidMinor: initialPaid,
              paymentState,
            },
          },
        });

        return tx.sale.findUniqueOrThrow({
          where: { id: sale.id },
          include: { items: true, payments: true, customer: true },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const again = await prisma.sale.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
          include: { items: true, payments: true, customer: true },
        });
        if (again && again.merchantId === data.merchantId) return again;
      }
      throw error;
    }
  });
}

export async function recordSaleCashPayment(userId: string, input: unknown) {
  const parsed = salePaymentSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Invalid payment", parsed.error.issues);
  }
  const data = parsed.data;
  await requireMerchantMembership(userId, data.merchantId);

  return bookkeepingIdempotency.run(
    `pay:${data.idempotencyKey}`,
    async () => {
      const existing = await prisma.payment.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existing) {
        if (existing.merchantId !== data.merchantId) {
          throw new AppError("CONFLICT", "Idempotency key conflict", 409);
        }
        return existing;
      }

      try {
        return await prisma.$transaction(async (tx) => {
          const sale = await tx.sale.findFirst({
            where: { id: data.saleId, merchantId: data.merchantId },
          });
          if (!sale || sale.status !== "FINALIZED") {
            throw new ValidationError("Finalized sale not found");
          }

          // Never rewrite finalized totals — only payment state fields.
          const next = applySalePayment(
            sale.totalMinor,
            sale.amountPaidMinor,
            data.amountMinor,
          );

          const payment = await tx.payment.create({
            data: {
              merchantId: data.merchantId,
              saleId: sale.id,
              customerId: sale.customerId,
              status: "SETTLED",
              kind: "SALE_PAYMENT",
              method: "CASH",
              description: data.description ?? "Cash payment on sale",
              amountFiatMinor: data.amountMinor,
              fiatCurrency: sale.currency,
              idempotencyKey: data.idempotencyKey,
              settledAt: new Date(),
            },
          });

          await tx.sale.update({
            where: { id: sale.id },
            data: {
              amountPaidMinor: next.amountPaidMinor,
              paymentState: next.paymentState,
            },
          });

          if (sale.customerId) {
            await tx.customerLedgerEntry.create({
              data: {
                merchantId: data.merchantId,
                customerId: sale.customerId,
                entryType: "CREDIT",
                amountMinor: data.amountMinor,
                currency: sale.currency,
                relatedSaleId: sale.id,
                relatedPaymentId: payment.id,
                note: "Partial/full repayment on sale",
              },
            });
          }

          return payment;
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          const again = await prisma.payment.findUnique({
            where: { idempotencyKey: data.idempotencyKey },
          });
          if (again && again.merchantId === data.merchantId) return again;
        }
        throw error;
      }
    },
  );
}

export async function listSales(userId: string, filters: unknown) {
  const parsed = historyFilterSchema.safeParse(filters);
  if (!parsed.success) {
    throw new ValidationError("Invalid filters", parsed.error.issues);
  }
  const { merchantId, from, to, paymentState } = parsed.data;
  await requireMerchantMembership(userId, merchantId);

  const createdAt: Prisma.DateTimeFilter = {};
  if (from) createdAt.gte = new Date(from);
  if (to) {
    const end = new Date(to);
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      end.setHours(23, 59, 59, 999);
    }
    createdAt.lte = end;
  }

  return prisma.sale.findMany({
    where: {
      merchantId,
      status: "FINALIZED",
      ...(paymentState ? { paymentState } : {}),
      ...(from || to ? { createdAt } : {}),
    },
    include: { items: true, customer: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
}
