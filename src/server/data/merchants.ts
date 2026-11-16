import "server-only";

import type { Merchant } from "@prisma/client";

import type { Merchant as UiMerchant } from "@/data/types";
import {
  listAccessibleMerchants,
  requireMerchantMembership,
} from "@/server/authz/merchant";
import { prisma } from "@/server/db/prisma";
import { toPublicWalletConnection } from "@/server/crypto/wallet-secrets";
import { ForbiddenError } from "@/server/errors";

export function toUiMerchant(merchant: Merchant): UiMerchant {
  return {
    id: merchant.id,
    name: merchant.name,
    displayCurrency: "XOF",
    locale: merchant.locale === "fr" ? "fr" : "en",
    city: merchant.city ?? "",
    phone: merchant.phone ?? "",
    nostrPublishOptIn: merchant.nostrPublishOptIn ?? false,
  };
}

export async function getMerchantsForUser(userId: string): Promise<UiMerchant[]> {
  const merchants = await listAccessibleMerchants(userId);
  return merchants.map(toUiMerchant);
}

/**
 * Resolve the active merchant for a user.
 * Optional preferredMerchantId is verified via membership — never trusted alone.
 */
export async function resolveActiveMerchant(
  userId: string,
  preferredMerchantId?: string | null,
): Promise<UiMerchant> {
  const merchants = await listAccessibleMerchants(userId);
  if (merchants.length === 0) {
    throw new ForbiddenError("No merchant profile found");
  }

  if (preferredMerchantId) {
    const access = await requireMerchantMembership(userId, preferredMerchantId);
    return toUiMerchant(access.merchant);
  }

  return toUiMerchant(merchants[0]);
}

export async function getDashboardSummaryForMerchant(
  userId: string,
  merchantId: string,
) {
  await requireMerchantMembership(userId, merchantId);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todaySales, customers, latestSales, latestPayments, ledger] =
    await Promise.all([
      prisma.sale.findMany({
        where: {
          merchantId,
          status: "FINALIZED",
          finalizedAt: { gte: startOfDay },
        },
        include: { items: true, customer: true },
      }),
      prisma.customer.findMany({
        where: { merchantId, status: "ACTIVE" },
        include: { ledgerEntries: true },
      }),
      prisma.sale.findMany({
        where: { merchantId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { items: true, customer: true },
      }),
      prisma.payment.findMany({
        where: { merchantId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.customerLedgerEntry.findMany({
        where: { merchantId },
      }),
    ]);

  const todayRevenueXof = todaySales.reduce((sum, s) => sum + s.totalMinor, 0);

  const balances = new Map<string, number>();
  for (const entry of ledger) {
    const current = balances.get(entry.customerId) ?? 0;
    const delta =
      entry.entryType === "DEBIT"
        ? entry.amountMinor
        : entry.entryType === "CREDIT"
          ? -entry.amountMinor
          : entry.amountMinor;
    balances.set(entry.customerId, current + delta);
  }

  const outstandingBalancesXof = [...balances.values()]
    .filter((v) => v > 0)
    .reduce((a, b) => a + b, 0);

  return {
    todayRevenueXof,
    todaySaleCount: todaySales.length,
    outstandingBalancesXof,
    customerCount: customers.length,
    latestSales: latestSales.map((sale) => ({
      id: sale.id,
      productId: sale.items[0]?.productId ?? "",
      productName: sale.items[0]?.productName ?? "Sale",
      quantity: sale.items[0]?.quantity ?? 0,
      unitPriceXof: sale.items[0]?.unitPriceMinor ?? 0,
      totalXof: sale.totalMinor,
      paymentMethod:
        sale.paymentMethod === "LIGHTNING"
          ? ("lightning" as const)
          : sale.paymentMethod === "CASH"
            ? ("cash" as const)
            : ("credit" as const),
      customerId: sale.customerId,
      customerName: sale.customer?.name ?? null,
      createdAt: sale.createdAt.toISOString(),
      status:
        sale.status === "FINALIZED"
          ? ("completed" as const)
          : ("pending" as const),
    })),
    latestPayments: latestPayments.map((payment) =>
      mapPaymentForUi(payment),
    ),
  };
}

function mapPaymentStatus(
  status: string,
): "settled" | "pending" | "expired" | "failed" {
  switch (status) {
    case "SETTLED":
      return "settled";
    case "PENDING":
      return "pending";
    case "EXPIRED":
      return "expired";
    default:
      return "failed";
  }
}

function mapPaymentForUi(payment: {
  id: string;
  amountSats: number | null;
  amountFiatMinor: number | null;
  status: string;
  description: string | null;
  createdAt: Date;
  settledAt: Date | null;
  method: string;
}) {
  return {
    id: payment.id,
    amountSats: payment.amountSats,
    amountXof: payment.amountFiatMinor,
    status: mapPaymentStatus(payment.status),
    description: payment.description ?? "",
    createdAt: payment.createdAt.toISOString(),
    settledAt: payment.settledAt?.toISOString() ?? null,
    method:
      payment.method === "LIGHTNING"
        ? ("lightning" as const)
        : payment.method === "CASH"
          ? ("cash" as const)
          : ("credit" as const),
  };
}

export async function listProductsForMerchant(
  userId: string,
  merchantId: string,
) {
  await requireMerchantMembership(userId, merchantId);
  const products = await prisma.product.findMany({
    where: { merchantId, status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    unitPriceXof: p.unitPriceMinor,
    active: p.active,
    category: p.category ?? "",
  }));
}

export async function listCustomersForMerchant(
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
    const balanceOwedXof = customer.ledgerEntries.reduce((sum, entry) => {
      if (entry.entryType === "DEBIT") return sum + entry.amountMinor;
      if (entry.entryType === "CREDIT") return sum - entry.amountMinor;
      return sum + entry.amountMinor;
    }, 0);

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone ?? "",
      balanceOwedXof,
    };
  });
}

export async function listPaymentsForMerchant(
  userId: string,
  merchantId: string,
) {
  await requireMerchantMembership(userId, merchantId);
  const payments = await prisma.payment.findMany({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
  });

  return payments.map((payment) => mapPaymentForUi(payment));
}

export async function listExpensesForMerchant(
  userId: string,
  merchantId: string,
) {
  await requireMerchantMembership(userId, merchantId);
  const expenses = await prisma.expense.findMany({
    where: { merchantId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  return expenses.map((e) => ({
    id: e.id,
    category: e.category,
    description: e.description,
    amountXof: e.amountMinor,
    createdAt: e.createdAt.toISOString(),
  }));
}

export async function getWalletStatusForMerchant(
  userId: string,
  merchantId: string,
) {
  await requireMerchantMembership(userId, merchantId);
  const connection = await prisma.walletConnection.findFirst({
    where: { merchantId },
    orderBy: { updatedAt: "desc" },
  });

  if (!connection) {
    return {
      status: "disconnected" as const,
      label: "No wallet connected",
      balanceSats: null,
      lastCheckedAt: null,
      connection: null,
    };
  }

  // Public DTO only — credentials never leave the server.
  const publicConnection = toPublicWalletConnection(connection);

  return {
    status:
      connection.status === "CONNECTED"
        ? ("connected" as const)
        : connection.status === "DISCONNECTED"
          ? ("disconnected" as const)
          : ("unknown" as const),
    label: connection.label ?? "Wallet",
    balanceSats: null,
    lastCheckedAt: connection.lastCheckedAt?.toISOString() ?? null,
    connection: publicConnection,
  };
}
