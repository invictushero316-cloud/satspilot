import "server-only";

import { getMerchantAnalytics } from "@/server/services/analytics";
import { listCustomersWithBalances } from "@/server/services/customers";
import { prisma } from "@/server/db/prisma";
import { requireMerchantMembership } from "@/server/authz/merchant";
import { listProducts } from "@/server/services/products";
import type { AssistantDataQuery } from "@/server/ai/schemas";
import { redactForAiContext } from "@/server/ai/safety";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 Sun
  const diff = day === 0 ? 6 : day - 1; // Monday start
  x.setDate(x.getDate() - diff);
  return x;
}

/** Catalog slice safe to show the model — no wallet data, phones redacted. */
export async function loadAssistantCatalog(userId: string, merchantId: string) {
  await requireMerchantMembership(userId, merchantId);
  const products = await listProducts(userId, merchantId);
  const customers = await listCustomersWithBalances(userId, merchantId);

  return {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      unitPriceMinor: p.unitPriceMinor,
      currency: p.currency,
      category: p.category,
    })),
    customers: customers.map((c) => ({
      id: c.id,
      name: redactForAiContext(c.name),
      // Intentionally omit phone — unnecessary PII for the model.
      balanceOwedMinor: c.balanceOwedMinor,
    })),
  };
}

/**
 * Allowlisted read tools. Every path re-checks merchant membership.
 * Totals come from deterministic server code — never from the model.
 */
export async function runAssistantDataQuery(
  userId: string,
  merchantId: string,
  query: AssistantDataQuery,
): Promise<Record<string, unknown>> {
  await requireMerchantMembership(userId, merchantId);

  switch (query) {
    case "today_sales": {
      const from = startOfDay();
      const analytics = await getMerchantAnalytics(userId, merchantId, { from });
      const count = await prisma.sale.count({
        where: {
          merchantId,
          status: "FINALIZED",
          finalizedAt: { gte: from },
        },
      });
      return {
        query,
        currency: "XOF",
        from: from.toISOString(),
        saleCount: count,
        grossSalesMinor: analytics.grossSalesMinor,
        receiptsMinor: analytics.receiptsMinor,
        note: "Gross sales from finalized invoices — not profit.",
      };
    }
    case "week_sales": {
      const from = startOfWeek();
      const analytics = await getMerchantAnalytics(userId, merchantId, { from });
      const count = await prisma.sale.count({
        where: {
          merchantId,
          status: "FINALIZED",
          finalizedAt: { gte: from },
        },
      });
      return {
        query,
        currency: "XOF",
        from: from.toISOString(),
        saleCount: count,
        grossSalesMinor: analytics.grossSalesMinor,
        receiptsMinor: analytics.receiptsMinor,
        expensesMinor: analytics.expensesMinor,
        note: "Weekly figures from stored transactions only.",
      };
    }
    case "outstanding_balances": {
      const customers = await listCustomersWithBalances(userId, merchantId);
      const owed = customers
        .filter((c) => c.balanceOwedMinor > 0)
        .sort((a, b) => b.balanceOwedMinor - a.balanceOwedMinor)
        .slice(0, 20)
        .map((c) => ({
          customerId: c.id,
          name: c.name,
          balanceOwedMinor: c.balanceOwedMinor,
          currency: "XOF",
        }));
      const totalOwedMinor = owed.reduce((s, c) => s + c.balanceOwedMinor, 0);
      return {
        query,
        currency: "XOF",
        totalOwedMinor,
        customers: owed,
      };
    }
    case "expenses": {
      const from = startOfWeek();
      const expenses = await prisma.expense.findMany({
        where: {
          merchantId,
          status: "ACTIVE",
          occurredOn: { gte: from },
        },
        orderBy: { occurredOn: "desc" },
        take: 20,
        select: {
          id: true,
          category: true,
          description: true,
          amountMinor: true,
          currency: true,
          occurredOn: true,
        },
      });
      const totalMinor = expenses.reduce((s, e) => s + e.amountMinor, 0);
      return {
        query,
        currency: "XOF",
        from: from.toISOString(),
        totalMinor,
        expenses: expenses.map((e) => ({
          id: e.id,
          category: e.category,
          description: e.description,
          amountMinor: e.amountMinor,
          occurredOn: e.occurredOn.toISOString(),
        })),
      };
    }
    case "payment_history": {
      const payments = await prisma.payment.findMany({
        where: { merchantId, status: "SETTLED" },
        orderBy: { settledAt: "desc" },
        take: 15,
        select: {
          id: true,
          kind: true,
          method: true,
          amountFiatMinor: true,
          amountSats: true,
          description: true,
          settledAt: true,
        },
      });
      return {
        query,
        payments: payments.map((p) => ({
          id: p.id,
          kind: p.kind,
          method: p.method,
          amountFiatMinor: p.amountFiatMinor,
          amountSats: p.amountSats,
          description: p.description,
          settledAt: p.settledAt?.toISOString() ?? null,
        })),
      };
    }
    default: {
      const _exhaustive: never = query;
      return { query: _exhaustive, error: "unknown_query" };
    }
  }
}
