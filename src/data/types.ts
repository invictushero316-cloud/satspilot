/** UI / DTO types for merchant bookkeeping screens. */

export type PaymentMethod = "cash" | "credit";
export type PaymentStatus =
  | "settled"
  | "pending"
  | "expired"
  | "failed"
  | "unknown";
export type SalePaymentState = "unpaid" | "partially_paid" | "paid";
export type WalletConnectionStatus = "connected" | "disconnected" | "unknown";

export type Merchant = {
  id: string;
  name: string;
  displayCurrency: "XOF";
  locale: "en" | "fr";
  city: string;
  phone: string;
  nostrPublishOptIn?: boolean;
};

export type Product = {
  id: string;
  name: string;
  /** Unit price in whole XOF (integer). */
  unitPriceXof: number;
  currency: "XOF";
  active: boolean;
  category: string;
  trackStock: boolean;
  stockOnHand: number | null;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  /** Outstanding balance in whole XOF (integer). Positive = customer owes merchant. */
  balanceOwedXof: number;
};

export type SaleLine = {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPriceXof: number;
  lineTotalXof: number;
  currency: "XOF";
};

export type Sale = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceXof: number;
  totalXof: number;
  amountPaidXof: number;
  paymentState: SalePaymentState;
  paymentMethod: PaymentMethod | null;
  customerId: string | null;
  customerName: string | null;
  createdAt: string;
  status: "completed" | "pending" | "cancelled";
  items: SaleLine[];
};

export type Payment = {
  id: string;
  amountSats: number | null;
  amountXof: number | null;
  status: PaymentStatus;
  kind: "sale_payment" | "customer_repayment" | "refund";
  description: string;
  createdAt: string;
  settledAt: string | null;
  method: PaymentMethod | "lightning";
  saleId: string | null;
  customerId: string | null;
};

export type Expense = {
  id: string;
  category: string;
  description: string;
  amountXof: number;
  occurredOn: string;
  createdAt: string;
};

export type WalletStatus = {
  status: WalletConnectionStatus;
  label: string;
  balanceSats: number | null;
  lastCheckedAt: string | null;
};

export type MerchantAnalytics = {
  currency: "XOF";
  grossSalesXof: number;
  receiptsXof: number;
  refundsXof: number;
  netReceiptsXof: number;
  expensesXof: number;
  outstandingBalancesXof: number;
  /** Not profit — COGS not tracked. */
  salesMinusExpensesXof: number;
};

export type DashboardSummary = {
  todayGrossSalesXof: number;
  todayReceiptsXof: number;
  todayExpensesXof: number;
  todaySaleCount: number;
  outstandingBalancesXof: number;
  analytics: MerchantAnalytics;
  latestSales: Sale[];
  latestPayments: Payment[];
};

export type AssistantSuggestion = {
  id: string;
  promptKey: string;
};

export type AssistantSaleLineCard = {
  productId: string | null;
  productName: string;
  quantity: number;
  unitPriceXof: number;
  lineTotalXof: number;
  matchStatus: string;
  warnings: string[];
};

export type AssistantSaleCard = {
  id: string;
  status: "pending_confirmation" | "needs_clarification";
  lines: AssistantSaleLineCard[];
  totalXof: number;
  customerId: string | null;
  customerName: string | null;
  customerAmbiguous: boolean;
  paymentMethod: "cash" | "credit";
  notes: string | null;
  warnings: string[];
  clarifyingQuestions: string[];
};

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  saleCard?: AssistantSaleCard | null;
  meta?: {
    intent?: string;
    provider?: string;
    usedFallback?: boolean;
  };
};
