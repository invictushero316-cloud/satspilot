import "server-only";

import { Prisma } from "@prisma/client";

import { requireMerchantMembership } from "@/server/authz/merchant";
import { sumLedgerBalance } from "@/server/bookkeeping/money-math";
import { bookkeepingIdempotency } from "@/server/bookkeeping/idempotency";
import { prisma } from "@/server/db/prisma";
import { AppError, ValidationError } from "@/server/errors";
import {
  customerInputSchema,
  customerRepaymentSchema,
} from "@/server/validation/bookkeeping";

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createCustomer(userId: string, input: unknown) {
  const parsed = customerInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Invalid customer", parsed.error.issues);
  }
  const data = parsed.data;
  await requireMerchantMembership(userId, data.merchantId);

  return prisma.customer.create({
    data: {
      merchantId: data.merchantId,
      name: data.name,
      phone: data.phone,
      status: "ACTIVE",
    },
  });
}

export async function listCustomersWithBalances(
  userId: string,
  merchantId: string,
) {
  await requireMerchantMembership(userId, merchantId);
  const customers = await prisma.customer.findMany({
    where: { merchantId, status: "ACTIVE" },
    include: { ledgerEntries: true },
    orderBy: { name: "asc" },
  });

  return customers.map((customer) => {
    const balanceOwedMinor = sumLedgerBalance(customer.ledgerEntries);
    return {
      id: customer.id,
      merchantId: customer.merchantId,
      name: customer.name,
      phone: customer.phone,
      balanceOwedMinor,
      createdAt: customer.createdAt,
    };
  });
}

/** Recompute balance from ledger and assert it matches the sum helper. */
export async function reconcileCustomerBalance(
  userId: string,
  merchantId: string,
  customerId: string,
) {
  await requireMerchantMembership(userId, merchantId);
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, merchantId },
    include: { ledgerEntries: true },
  });
  if (!customer) {
    throw new AppError("NOT_FOUND", "Customer not found", 404);
  }
  const balanceOwedMinor = sumLedgerBalance(customer.ledgerEntries);
  return {
    customerId,
    entryCount: customer.ledgerEntries.length,
    balanceOwedMinor,
    entries: customer.ledgerEntries.map((e) => ({
      id: e.id,
      entryType: e.entryType,
      amountMinor: e.amountMinor,
      createdAt: e.createdAt,
    })),
  };
}

export async function recordCustomerRepayment(userId: string, input: unknown) {
  const parsed = customerRepaymentSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Invalid repayment", parsed.error.issues);
  }
  const data = parsed.data;
  await requireMerchantMembership(userId, data.merchantId);

  return bookkeepingIdempotency.run(
    `repay:${data.idempotencyKey}`,
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
          const customer = await tx.customer.findFirst({
            where: {
              id: data.customerId,
              merchantId: data.merchantId,
              status: "ACTIVE",
            },
            include: { ledgerEntries: true },
          });
          if (!customer) {
            throw new ValidationError("Customer not found");
          }

          const balance = sumLedgerBalance(customer.ledgerEntries);
          if (data.amountMinor > balance) {
            throw new ValidationError(
              `Repayment ${data.amountMinor} exceeds balance owed ${balance}`,
            );
          }

          const payment = await tx.payment.create({
            data: {
              merchantId: data.merchantId,
              customerId: customer.id,
              status: "SETTLED",
              kind: "CUSTOMER_REPAYMENT",
              method: "CASH",
              description: data.description ?? "Customer cash repayment",
              amountFiatMinor: data.amountMinor,
              fiatCurrency: "XOF",
              idempotencyKey: data.idempotencyKey,
              settledAt: new Date(),
            },
          });

          await tx.customerLedgerEntry.create({
            data: {
              merchantId: data.merchantId,
              customerId: customer.id,
              entryType: "CREDIT",
              amountMinor: data.amountMinor,
              currency: "XOF",
              relatedPaymentId: payment.id,
              note: "Customer repayment",
            },
          });

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
