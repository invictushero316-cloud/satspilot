"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import {
  createReceiptForSale,
  getReceiptForMerchant,
  publishReceiptToRelay,
  setNostrPublishOptIn,
} from "@/server/receipts/service";
import { ensureMerchantSigningIdentity } from "@/server/receipts/signing-identity";

export type ReceiptActionState =
  | { ok: true; data?: unknown; message?: string }
  | { ok: false; error: string };

function fail(error: unknown): ReceiptActionState {
  if (error instanceof AppError) return { ok: false, error: error.message };
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: "Unexpected error" };
}

export async function ensureSigningIdentityAction(
  merchantId: string,
): Promise<ReceiptActionState> {
  try {
    const session = await requireSession();
    const identity = await ensureMerchantSigningIdentity(
      session.user.id,
      merchantId,
    );
    return { ok: true, data: identity };
  } catch (error) {
    return fail(error);
  }
}

export async function createReceiptAction(
  merchantId: string,
  saleId: string,
): Promise<ReceiptActionState> {
  try {
    const session = await requireSession();
    // membership checked inside createReceiptForSale via sale.merchantId
    void merchantId;
    const receipt = await createReceiptForSale(session.user.id, saleId);
    revalidatePath("/sales");
    return { ok: true, data: receipt };
  } catch (error) {
    return fail(error);
  }
}

export async function getSaleReceiptAction(
  merchantId: string,
  saleId: string,
): Promise<ReceiptActionState> {
  try {
    const session = await requireSession();
    const receipt = await getReceiptForMerchant(
      session.user.id,
      merchantId,
      saleId,
    );
    return { ok: true, data: receipt };
  } catch (error) {
    return fail(error);
  }
}

export async function setNostrOptInAction(
  _prev: ReceiptActionState | null,
  formData: FormData,
): Promise<ReceiptActionState> {
  try {
    const session = await requireSession();
    const merchantId = String(formData.get("merchantId") ?? "");
    const optIn = formData.get("optIn") === "on" || formData.get("optIn") === "true";
    const result = await setNostrPublishOptIn(
      session.user.id,
      merchantId,
      optIn,
    );
    revalidatePath("/settings");
    return { ok: true, data: result };
  } catch (error) {
    return fail(error);
  }
}

export async function publishReceiptAction(
  _prev: ReceiptActionState | null,
  formData: FormData,
): Promise<ReceiptActionState> {
  try {
    const session = await requireSession();
    const merchantId = String(formData.get("merchantId") ?? "");
    const saleId = String(formData.get("saleId") ?? "");
    const relayUrl = String(formData.get("relayUrl") ?? "").trim() || undefined;
    const result = await publishReceiptToRelay(
      session.user.id,
      merchantId,
      saleId,
      relayUrl,
    );
    revalidatePath(`/sales/${saleId}/receipt`);
    return {
      ok: true,
      data: result,
      message: result.duplicate
        ? "Already published (idempotent)"
        : "Published to relay",
    };
  } catch (error) {
    return fail(error);
  }
}
