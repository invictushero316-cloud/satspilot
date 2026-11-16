"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { getMerchantAnalytics } from "@/server/services/analytics";
import {
  createCustomer,
  recordCustomerRepayment,
} from "@/server/services/customers";
import { createExpense } from "@/server/services/expenses";
import {
  archiveProduct,
  createProduct,
  updateProduct,
} from "@/server/services/products";
import {
  createFinalizedSale,
  recordSaleCashPayment,
} from "@/server/services/sales";
import { createReceiptForSale } from "@/server/receipts/service";

export type ActionState =
  | { ok: true; id?: string; message?: string }
  | { ok: false; error: string };

function fail(error: unknown): ActionState {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Unexpected error" };
}

function revalidateMerchant(merchantId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/products");
  revalidatePath("/customers");
  revalidatePath("/expenses");
  revalidatePath("/payments");
  revalidatePath("/sales");
  revalidatePath("/sales/new");
  revalidatePath(`/api/merchants/${merchantId}/products`);
}

export async function createProductAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireSession();
    const trackStock = formData.get("trackStock") === "on";
    const stockRaw = String(formData.get("stockOnHand") ?? "");
    const product = await createProduct(session.user.id, {
      merchantId: String(formData.get("merchantId")),
      name: String(formData.get("name") ?? ""),
      category: String(formData.get("category") ?? "") || undefined,
      unitPriceMinor: Number.parseInt(String(formData.get("unitPriceMinor")), 10),
      currency: "XOF",
      trackStock,
      stockOnHand: trackStock
        ? Number.parseInt(stockRaw || "0", 10)
        : null,
      active: true,
    });
    revalidateMerchant(product.merchantId);
    return { ok: true, id: product.id };
  } catch (error) {
    return fail(error);
  }
}

export async function updateProductAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireSession();
    const trackStock = formData.get("trackStock") === "on";
    const stockRaw = String(formData.get("stockOnHand") ?? "");
    const product = await updateProduct(session.user.id, {
      merchantId: String(formData.get("merchantId")),
      productId: String(formData.get("productId")),
      name: String(formData.get("name") ?? ""),
      category: String(formData.get("category") ?? "") || undefined,
      unitPriceMinor: Number.parseInt(String(formData.get("unitPriceMinor")), 10),
      currency: "XOF",
      trackStock,
      stockOnHand: trackStock
        ? Number.parseInt(stockRaw || "0", 10)
        : null,
      active: formData.get("active") !== "off",
    });
    revalidateMerchant(product.merchantId);
    return { ok: true, id: product.id };
  } catch (error) {
    return fail(error);
  }
}

export async function archiveProductAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireSession();
    const merchantId = String(formData.get("merchantId"));
    const productId = String(formData.get("productId"));
    await archiveProduct(session.user.id, merchantId, productId);
    revalidateMerchant(merchantId);
    return { ok: true, id: productId };
  } catch (error) {
    return fail(error);
  }
}

export async function createSaleAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireSession();
    const merchantId = String(formData.get("merchantId"));
    const linesRaw = String(formData.get("linesJson") ?? "[]");
    const lines = JSON.parse(linesRaw) as unknown;
    const sale = await createFinalizedSale(session.user.id, {
      merchantId,
      customerId: String(formData.get("customerId") || "") || null,
      currency: "XOF",
      paymentMethod: String(formData.get("paymentMethod") || "CASH"),
      cashPaidMinor: Number.parseInt(
        String(formData.get("cashPaidMinor") || "0"),
        10,
      ),
      notes: String(formData.get("notes") || "") || undefined,
      idempotencyKey: String(formData.get("idempotencyKey")),
      lines,
    });
    await createReceiptForSale(session.user.id, sale.id);
    revalidateMerchant(merchantId);
    return { ok: true, id: sale.id, message: "Sale recorded" };
  } catch (error) {
    return fail(error);
  }
}

export async function recordSalePaymentAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireSession();
    const merchantId = String(formData.get("merchantId"));
    const payment = await recordSaleCashPayment(session.user.id, {
      merchantId,
      saleId: String(formData.get("saleId")),
      amountMinor: Number.parseInt(String(formData.get("amountMinor")), 10),
      method: "CASH",
      idempotencyKey: String(formData.get("idempotencyKey")),
      description: String(formData.get("description") || "") || undefined,
    });
    revalidateMerchant(merchantId);
    return { ok: true, id: payment.id };
  } catch (error) {
    return fail(error);
  }
}

export async function createCustomerAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireSession();
    const customer = await createCustomer(session.user.id, {
      merchantId: String(formData.get("merchantId")),
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") || "") || undefined,
    });
    revalidateMerchant(customer.merchantId);
    return { ok: true, id: customer.id };
  } catch (error) {
    return fail(error);
  }
}

export async function recordRepaymentAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireSession();
    const merchantId = String(formData.get("merchantId"));
    const payment = await recordCustomerRepayment(session.user.id, {
      merchantId,
      customerId: String(formData.get("customerId")),
      amountMinor: Number.parseInt(String(formData.get("amountMinor")), 10),
      method: "CASH",
      idempotencyKey: String(formData.get("idempotencyKey")),
      description: String(formData.get("description") || "") || undefined,
    });
    revalidateMerchant(merchantId);
    return { ok: true, id: payment.id };
  } catch (error) {
    return fail(error);
  }
}

export async function createExpenseAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireSession();
    const expense = await createExpense(session.user.id, {
      merchantId: String(formData.get("merchantId")),
      category: String(formData.get("category") ?? ""),
      description: String(formData.get("description") ?? ""),
      amountMinor: Number.parseInt(String(formData.get("amountMinor")), 10),
      currency: "XOF",
      occurredOn: String(formData.get("occurredOn")),
      idempotencyKey: String(formData.get("idempotencyKey")),
    });
    revalidateMerchant(expense.merchantId);
    return { ok: true, id: expense.id };
  } catch (error) {
    return fail(error);
  }
}

export async function refreshAnalyticsAction(merchantId: string) {
  const session = await requireSession();
  return getMerchantAnalytics(session.user.id, merchantId);
}
