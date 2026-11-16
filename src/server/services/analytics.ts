import "server-only";

import { requireMerchantMembership } from "@/server/authz/merchant";
import {
  buildAnalytics,
  sumLedgerBalance,
} from "@/server/bookkeeping/money-math";
import { prisma } from "@/server/db/prisma";

export async function getMerchantAnalytics(
  userId: string,
  merchantId: string,
  options?: { from?: Date; to?: Date },
) {
  await requireMerchantMembership(userId, merchantId);

  const saleWhere = {
    merchantId,
    status: "FINALIZED" as const,
    ...(options?.from || options?.to
      ? {
          finalizedAt: {
            ...(options.from ? { gte: options.from } : {}),
            ...(options.to ? { lte: options.to } : {}),
          },
        }
      : {}),
  };

  const paymentWhere = {
    merchantId,
    status: "SETTLED" as const,
    ...(options?.from || options?.to
      ? {
          settledAt: {
            ...(options.from ? { gte: options.from } : {}),
            ...(options.to ? { lte: options.to } : {}),
          },
        }
      : {}),
  };

  const expenseWhere = {
    merchantId,
    status: "ACTIVE" as const,
    ...(options?.from || options?.to
      ? {
          occurredOn: {
            ...(options.from ? { gte: options.from } : {}),
            ...(options.to ? { lte: options.to } : {}),
          },
        }
      : {}),
  };

  const [sales, payments, expenses, customers] = await Promise.all([
    prisma.sale.findMany({
      where: saleWhere,
      select: { totalMinor: true },
    }),
    prisma.payment.findMany({
      where: paymentWhere,
      select: { kind: true, amountFiatMinor: true },
    }),
    prisma.expense.findMany({
      where: expenseWhere,
      select: { amountMinor: true },
    }),
    prisma.customer.findMany({
      where: { merchantId, status: "ACTIVE" },
      include: { ledgerEntries: true },
    }),
  ]);

  const grossSalesMinor = sales.reduce((sum, s) => sum + s.totalMinor, 0);

  let receiptsMinor = 0;
  let refundsMinor = 0;
  for (const payment of payments) {
    const amount = payment.amountFiatMinor ?? 0;
    if (payment.kind === "REFUND") refundsMinor += amount;
    else receiptsMinor += amount; // SALE_PAYMENT + CUSTOMER_REPAYMENT
  }

  const expensesMinor = expenses.reduce((sum, e) => sum + e.amountMinor, 0);

  const outstandingBalancesMinor = customers.reduce((sum, customer) => {
    const balance = sumLedgerBalance(customer.ledgerEntries);
    return sum + (balance > 0 ? balance : 0);
  }, 0);

  return buildAnalytics({
    currency: "XOF",
    grossSalesMinor,
    receiptsMinor,
    refundsMinor,
    expensesMinor,
    outstandingBalancesMinor,
  });
}

export async function getDashboardSnapshot(userId: string, merchantId: string) {
  await requireMerchantMembership(userId, merchantId);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const analytics = await getMerchantAnalytics(userId, merchantId, {
    from: startOfDay,
  });

  const [todaySales, latestSales, latestPayments, latestExpenses] =
    await Promise.all([
      prisma.sale.count({
        where: {
          merchantId,
          status: "FINALIZED",
          finalizedAt: { gte: startOfDay },
        },
      }),
      prisma.sale.findMany({
        where: { merchantId, status: "FINALIZED" },
        include: { items: true, customer: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.payment.findMany({
        where: { merchantId, status: "SETTLED" },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.expense.findMany({
        where: { merchantId, status: "ACTIVE" },
        orderBy: { occurredOn: "desc" },
        take: 5,
      }),
    ]);

  // Outstanding is all-time ledger, not just today.
  const allTime = await getMerchantAnalytics(userId, merchantId);

  return {
    analyticsToday: analytics,
    outstandingBalancesMinor: allTime.outstandingBalancesMinor,
    todaySaleCount: todaySales,
    latestSales,
    latestPayments,
    latestExpenses,
    allTime,
  };
}
