import type {
  Customer as DbCustomer,
  Expense as DbExpense,
  Payment as DbPayment,
  Product as DbProduct,
  Sale as DbSale,
  SaleItem,
} from "@prisma/client";

import type {
  Customer,
  Expense,
  MerchantAnalytics,
  Payment,
  Product,
  Sale,
  SaleLine,
} from "@/data/types";
import type { MerchantAnalytics as ServerAnalytics } from "@/server/bookkeeping/money-math";

type SaleWithRelations = DbSale & {
  items: SaleItem[];
  customer?: { name: string } | null;
};

export function mapProduct(product: DbProduct): Product {
  return {
    id: product.id,
    name: product.name,
    unitPriceXof: product.unitPriceMinor,
    currency: "XOF",
    active: product.active,
    category: product.category ?? "",
    trackStock: product.trackStock,
    stockOnHand: product.stockOnHand,
  };
}

export function mapCustomer(input: {
  id: string;
  name: string;
  phone: string | null;
  balanceOwedMinor: number;
}): Customer {
  return {
    id: input.id,
    name: input.name,
    phone: input.phone ?? "",
    balanceOwedXof: input.balanceOwedMinor,
  };
}

export function mapSaleLine(item: SaleItem): SaleLine {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPriceXof: item.unitPriceMinor,
    lineTotalXof: item.lineTotalMinor,
    currency: "XOF",
  };
}

export function mapSale(sale: SaleWithRelations): Sale {
  const first = sale.items[0];
  return {
    id: sale.id,
    productId: first?.productId ?? "",
    productName:
      sale.items.length > 1
        ? `${sale.items.length} items`
        : (first?.productName ?? "Sale"),
    quantity: sale.items.reduce((sum, i) => sum + i.quantity, 0),
    unitPriceXof: first?.unitPriceMinor ?? 0,
    totalXof: sale.totalMinor,
    amountPaidXof: sale.amountPaidMinor,
    paymentState:
      sale.paymentState === "PAID"
        ? "paid"
        : sale.paymentState === "PARTIALLY_PAID"
          ? "partially_paid"
          : "unpaid",
    paymentMethod:
      sale.paymentMethod === "CASH"
        ? "cash"
        : sale.paymentMethod === "CREDIT"
          ? "credit"
          : null,
    customerId: sale.customerId,
    customerName: sale.customer?.name ?? null,
    createdAt: sale.createdAt.toISOString(),
    status:
      sale.status === "FINALIZED"
        ? "completed"
        : sale.status === "CANCELLED"
          ? "cancelled"
          : "pending",
    items: sale.items.map(mapSaleLine),
  };
}

export function mapPayment(payment: DbPayment): Payment {
  return {
    id: payment.id,
    amountSats: payment.amountSats,
    amountXof: payment.amountFiatMinor,
    status:
      payment.status === "SETTLED"
        ? "settled"
        : payment.status === "PENDING"
          ? "pending"
          : payment.status === "EXPIRED"
            ? "expired"
            : payment.status === "FAILED" || payment.status === "CANCELLED"
              ? "failed"
              : "unknown",
    kind:
      payment.kind === "REFUND"
        ? "refund"
        : payment.kind === "CUSTOMER_REPAYMENT"
          ? "customer_repayment"
          : "sale_payment",
    description: payment.description ?? "",
    createdAt: payment.createdAt.toISOString(),
    settledAt: payment.settledAt?.toISOString() ?? null,
    method:
      payment.method === "CASH"
        ? "cash"
        : payment.method === "CREDIT"
          ? "credit"
          : "lightning",
    saleId: payment.saleId,
    customerId: payment.customerId,
  };
}

export function mapExpense(expense: DbExpense): Expense {
  return {
    id: expense.id,
    category: expense.category,
    description: expense.description,
    amountXof: expense.amountMinor,
    occurredOn: expense.occurredOn.toISOString(),
    createdAt: expense.createdAt.toISOString(),
  };
}

export function mapAnalytics(a: ServerAnalytics): MerchantAnalytics {
  return {
    currency: "XOF",
    grossSalesXof: a.grossSalesMinor,
    receiptsXof: a.receiptsMinor,
    refundsXof: a.refundsMinor,
    netReceiptsXof: a.netReceiptsMinor,
    expensesXof: a.expensesMinor,
    outstandingBalancesXof: a.outstandingBalancesMinor,
    salesMinusExpensesXof: a.salesMinusExpensesMinor,
  };
}

export function mapDbCustomer(
  customer: DbCustomer & { balanceOwedMinor: number },
): Customer {
  return mapCustomer(customer);
}
