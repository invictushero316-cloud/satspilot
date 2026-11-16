import "server-only";

import { Prisma } from "@prisma/client";

import { requireMerchantMembership } from "@/server/authz/merchant";
import { bookkeepingIdempotency } from "@/server/bookkeeping/idempotency";
import { prisma } from "@/server/db/prisma";
import { AppError, ValidationError } from "@/server/errors";
import {
  expenseInputSchema,
  historyFilterSchema,
} from "@/server/validation/bookkeeping";

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function parseOccurredOn(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }
  return new Date(value);
}

export async function createExpense(userId: string, input: unknown) {
  const parsed = expenseInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Invalid expense", parsed.error.issues);
  }
  const data = parsed.data;
  await requireMerchantMembership(userId, data.merchantId);

  return bookkeepingIdempotency.run(
    `expense:${data.idempotencyKey}`,
    async () => {
      const existing = await prisma.expense.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existing) {
        if (existing.merchantId !== data.merchantId) {
          throw new AppError("CONFLICT", "Idempotency key conflict", 409);
        }
        return existing;
      }

      try {
        return await prisma.expense.create({
          data: {
            merchantId: data.merchantId,
            category: data.category,
            description: data.description,
            amountMinor: data.amountMinor,
            currency: data.currency,
            occurredOn: parseOccurredOn(data.occurredOn),
            idempotencyKey: data.idempotencyKey,
            status: "ACTIVE",
          },
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          const again = await prisma.expense.findUnique({
            where: { idempotencyKey: data.idempotencyKey },
          });
          if (again && again.merchantId === data.merchantId) return again;
        }
        throw error;
      }
    },
  );
}

export async function listExpenses(userId: string, filters: unknown) {
  const parsed = historyFilterSchema.safeParse(filters);
  if (!parsed.success) {
    throw new ValidationError("Invalid filters", parsed.error.issues);
  }
  const { merchantId, from, to, category } = parsed.data;
  await requireMerchantMembership(userId, merchantId);

  const occurredOn: Prisma.DateTimeFilter = {};
  if (from) occurredOn.gte = new Date(from);
  if (to) {
    const end = new Date(to);
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      end.setHours(23, 59, 59, 999);
    }
    occurredOn.lte = end;
  }

  return prisma.expense.findMany({
    where: {
      merchantId,
      status: "ACTIVE",
      ...(category ? { category } : {}),
      ...(from || to ? { occurredOn } : {}),
    },
    orderBy: { occurredOn: "desc" },
  });
}
