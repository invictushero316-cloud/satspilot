import { ValidationError } from "@/server/errors";

/** Assert a value is a safe non-negative integer money amount (minor units). */
export function requireNonNegativeInt(
  value: unknown,
  field = "amount",
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${field} must be a non-negative integer`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new ValidationError(`${field} exceeds safe integer range`);
  }
  return value;
}

/** Assert a value is a positive integer (>= 1). */
export function requirePositiveInt(value: unknown, field = "amount"): number {
  const n = requireNonNegativeInt(value, field);
  if (n < 1) {
    throw new ValidationError(`${field} must be at least 1`);
  }
  return n;
}

export type SaleLineInput = {
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPriceMinor: number;
  currency: string;
};

export type ComputedSaleLine = SaleLineInput & {
  lineTotalMinor: number;
};

/** Integer line total: quantity × unitPriceMinor. */
export function computeLineTotal(
  quantity: number,
  unitPriceMinor: number,
): number {
  const qty = requirePositiveInt(quantity, "quantity");
  const price = requireNonNegativeInt(unitPriceMinor, "unitPriceMinor");
  const total = qty * price;
  if (!Number.isSafeInteger(total)) {
    throw new ValidationError("line total exceeds safe integer range");
  }
  return total;
}

/**
 * Compute sale totals from lines. All line currencies must match saleCurrency.
 * Returns integer totalMinor.
 */
export function computeSaleTotals(
  lines: SaleLineInput[],
  saleCurrency: string,
): { lines: ComputedSaleLine[]; totalMinor: number } {
  if (!lines.length) {
    throw new ValidationError("A sale requires at least one line item");
  }

  const computed: ComputedSaleLine[] = [];
  let totalMinor = 0;

  for (const line of lines) {
    if (!line.productName?.trim()) {
      throw new ValidationError("Each line requires a product name");
    }
    if (line.currency !== saleCurrency) {
      throw new ValidationError(
        `Item currency ${line.currency} does not match sale currency ${saleCurrency}`,
      );
    }
    const lineTotalMinor = computeLineTotal(line.quantity, line.unitPriceMinor);
    computed.push({ ...line, lineTotalMinor });
    totalMinor += lineTotalMinor;
    if (!Number.isSafeInteger(totalMinor)) {
      throw new ValidationError("sale total exceeds safe integer range");
    }
  }

  return { lines: computed, totalMinor };
}

export type SalePaymentState = "UNPAID" | "PARTIALLY_PAID" | "PAID";

/**
 * Derive payment state from totals.
 * amountPaidMinor is net settled sale payments minus refunds (never negative).
 */
export function deriveSalePaymentState(
  totalMinor: number,
  amountPaidMinor: number,
): SalePaymentState {
  const total = requireNonNegativeInt(totalMinor, "totalMinor");
  const paid = requireNonNegativeInt(amountPaidMinor, "amountPaidMinor");
  if (paid > total) {
    throw new ValidationError("amount paid cannot exceed sale total");
  }
  if (paid === 0) return "UNPAID";
  if (paid === total) return "PAID";
  return "PARTIALLY_PAID";
}

/** Remaining balance due on a sale. */
export function saleBalanceDue(
  totalMinor: number,
  amountPaidMinor: number,
): number {
  const total = requireNonNegativeInt(totalMinor, "totalMinor");
  const paid = requireNonNegativeInt(amountPaidMinor, "amountPaidMinor");
  if (paid > total) {
    throw new ValidationError("amount paid cannot exceed sale total");
  }
  return total - paid;
}

/**
 * Apply a settled sale payment (cash receipt against a sale).
 * Returns the new amountPaidMinor.
 */
export function applySalePayment(
  totalMinor: number,
  currentPaidMinor: number,
  paymentMinor: number,
): { amountPaidMinor: number; paymentState: SalePaymentState } {
  const payment = requirePositiveInt(paymentMinor, "paymentMinor");
  const due = saleBalanceDue(totalMinor, currentPaidMinor);
  if (payment > due) {
    throw new ValidationError(
      `Payment ${payment} exceeds remaining balance ${due}`,
    );
  }
  const amountPaidMinor = currentPaidMinor + payment;
  return {
    amountPaidMinor,
    paymentState: deriveSalePaymentState(totalMinor, amountPaidMinor),
  };
}

/**
 * Apply a refund against a sale (reduces amount paid, never below zero).
 */
export function applySaleRefund(
  totalMinor: number,
  currentPaidMinor: number,
  refundMinor: number,
): { amountPaidMinor: number; paymentState: SalePaymentState } {
  const refund = requirePositiveInt(refundMinor, "refundMinor");
  const paid = requireNonNegativeInt(currentPaidMinor, "amountPaidMinor");
  if (refund > paid) {
    throw new ValidationError("Refund cannot exceed amount paid");
  }
  const amountPaidMinor = paid - refund;
  return {
    amountPaidMinor,
    paymentState: deriveSalePaymentState(totalMinor, amountPaidMinor),
  };
}

export type LedgerEntryInput = {
  entryType: "DEBIT" | "CREDIT" | "ADJUSTMENT";
  amountMinor: number;
};

/**
 * Customer balance owed = sum(DEBIT) - sum(CREDIT) + sum(ADJUSTMENT).
 * Positive means the customer owes the merchant.
 */
export function sumLedgerBalance(entries: LedgerEntryInput[]): number {
  let balance = 0;
  for (const entry of entries) {
    const amount = requirePositiveInt(entry.amountMinor, "ledger amount");
    if (entry.entryType === "DEBIT") balance += amount;
    else if (entry.entryType === "CREDIT") balance -= amount;
    else balance += amount; // ADJUSTMENT signed via positive magnitude convention: use DEBIT/CREDIT preferred
    if (!Number.isSafeInteger(balance)) {
      throw new ValidationError("ledger balance exceeds safe integer range");
    }
  }
  return balance;
}

/**
 * Analytics buckets — never labeled as "profit" (COGS not tracked).
 */
export type MerchantAnalytics = {
  currency: string;
  grossSalesMinor: number;
  receiptsMinor: number;
  refundsMinor: number;
  netReceiptsMinor: number;
  expensesMinor: number;
  outstandingBalancesMinor: number;
  /** grossSales - expenses is NOT profit; exposed only as cashflow hint label elsewhere. */
  salesMinusExpensesMinor: number;
};

export function buildAnalytics(input: {
  currency: string;
  grossSalesMinor: number;
  receiptsMinor: number;
  refundsMinor: number;
  expensesMinor: number;
  outstandingBalancesMinor: number;
}): MerchantAnalytics {
  const grossSalesMinor = requireNonNegativeInt(
    input.grossSalesMinor,
    "grossSalesMinor",
  );
  const receiptsMinor = requireNonNegativeInt(
    input.receiptsMinor,
    "receiptsMinor",
  );
  const refundsMinor = requireNonNegativeInt(input.refundsMinor, "refundsMinor");
  const expensesMinor = requireNonNegativeInt(
    input.expensesMinor,
    "expensesMinor",
  );
  const outstandingBalancesMinor = requireNonNegativeInt(
    input.outstandingBalancesMinor,
    "outstandingBalancesMinor",
  );
  const netReceiptsMinor = receiptsMinor - refundsMinor;
  return {
    currency: input.currency,
    grossSalesMinor,
    receiptsMinor,
    refundsMinor,
    netReceiptsMinor,
    expensesMinor,
    outstandingBalancesMinor,
    salesMinusExpensesMinor: grossSalesMinor - expensesMinor,
  };
}
