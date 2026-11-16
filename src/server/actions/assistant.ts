"use server";

import { revalidatePath } from "next/cache";

import { handleAssistantChat } from "@/server/ai/assistant";
import { confirmSaleSuggestionSchema } from "@/server/ai/schemas";
import type { AssistantChatResult, SaleSuggestion } from "@/server/ai/types";
import { requireSession } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { createFinalizedSale } from "@/server/services/sales";
import { computeSaleTotals } from "@/server/bookkeeping/money-math";
import { createReceiptForSale } from "@/server/receipts/service";

export type AssistantActionState =
  | { ok: true; result: AssistantChatResult }
  | { ok: false; error: string };

export type ConfirmSaleActionState =
  | { ok: true; saleId: string; message: string }
  | { ok: false; error: string };

function fail(error: unknown): { ok: false; error: string } {
  if (error instanceof AppError) return { ok: false, error: error.message };
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: "Unexpected error" };
}

export async function chatAssistantAction(input: {
  merchantId: string;
  message: string;
  locale?: "en" | "fr";
}): Promise<AssistantActionState> {
  try {
    const session = await requireSession();
    const result = await handleAssistantChat(session.user.id, input);
    return { ok: true, result };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Explicit confirmation path — the only way an AI-suggested sale becomes a ledger write.
 * AI output alone never mutates finances.
 */
export async function confirmAssistantSaleAction(input: {
  merchantId: string;
  suggestion: SaleSuggestion;
  idempotencyKey: string;
  confirmed: true;
}): Promise<ConfirmSaleActionState> {
  try {
    const session = await requireSession();

    if (input.suggestion.status !== "pending_confirmation") {
      throw new AppError(
        "CONFIRMATION_REQUIRED",
        "Sale suggestion still needs clarification",
        400,
      );
    }

    if (
      input.suggestion.lines.some(
        (l) =>
          l.matchStatus === "missing_price" ||
          l.matchStatus === "price_conflict" ||
          l.matchStatus === "unmatched" ||
          !l.productId,
      )
    ) {
      throw new AppError(
        "INVALID_SUGGESTION",
        "Cannot confirm a sale with unresolved products or prices",
        400,
      );
    }

    const lines = input.suggestion.lines.map((l) => ({
      productId: l.productId,
      productName: l.productName,
      quantity: l.quantity,
      unitPriceMinor: l.unitPriceMinor,
      currency: "XOF" as const,
    }));

    // Recompute totals server-side — never trust suggestion.totalMinor alone.
    const { totalMinor } = computeSaleTotals(lines, "XOF");
    if (totalMinor !== input.suggestion.totalMinor) {
      throw new AppError(
        "AMOUNT_MISMATCH",
        "Suggestion total no longer matches server calculation",
        409,
      );
    }

    const parsed = confirmSaleSuggestionSchema.safeParse({
      merchantId: input.merchantId,
      suggestionId: input.suggestion.id,
      idempotencyKey: input.idempotencyKey,
      confirmed: true,
      lines,
      customerId: input.suggestion.customerId,
      paymentMethod: input.suggestion.paymentMethod,
      cashPaidMinor:
        input.suggestion.paymentMethod === "CASH" ? totalMinor : 0,
      notes: input.suggestion.notes ?? undefined,
    });
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid confirmation payload", 400);
    }

    const sale = await createFinalizedSale(session.user.id, {
      merchantId: parsed.data.merchantId,
      customerId: parsed.data.customerId,
      currency: "XOF",
      paymentMethod: parsed.data.paymentMethod,
      cashPaidMinor: parsed.data.cashPaidMinor,
      notes: parsed.data.notes,
      idempotencyKey: parsed.data.idempotencyKey,
      lines: parsed.data.lines,
    });
    await createReceiptForSale(session.user.id, sale.id);

    revalidatePath("/dashboard");
    revalidatePath("/sales");
    revalidatePath("/payments");
    revalidatePath("/assistant");
    revalidatePath("/customers");

    return {
      ok: true,
      saleId: sale.id,
      message: "Sale recorded after explicit confirmation",
    };
  } catch (error) {
    return fail(error);
  }
}
