"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import {
  createLightningInvoice,
  getLightningPaymentForResume,
  lookupLightningPaymentStatus,
} from "@/server/services/lightning";

export type LightningInvoicePublic = {
  paymentId: string;
  saleId: string | null;
  status: string;
  amountSats: number | null;
  amountMsats: number | null;
  bolt11: string | null;
  paymentHash: string | null;
  expiresAt: string | null;
  settledAt: string | null;
  createdAt: string;
  description: string | null;
};

export type LightningActionState =
  | {
      ok: true;
      invoice?: LightningInvoicePublic;
      verified?: boolean;
      providerState?: string;
    }
  | { ok: false; error: string };

function fail(error: unknown): LightningActionState {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Unexpected error" };
}

export async function createLightningInvoiceAction(
  _prev: LightningActionState | null,
  formData: FormData,
): Promise<LightningActionState> {
  try {
    const session = await requireSession();
    const merchantId = String(formData.get("merchantId") ?? "");
    const amountSats = Number.parseInt(
      String(formData.get("amountSats") ?? ""),
      10,
    );
    const description =
      String(formData.get("description") ?? "").trim() || undefined;
    const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
    const saleIdRaw = String(formData.get("saleId") ?? "").trim();

    const invoice = await createLightningInvoice(session.user.id, {
      merchantId,
      amountSats,
      description,
      idempotencyKey,
      saleId: saleIdRaw || undefined,
      expirySeconds: 900,
    });

    revalidatePath("/payments");
    revalidatePath("/sales");
    revalidatePath("/dashboard");

    return { ok: true, invoice };
  } catch (error) {
    return fail(error);
  }
}

export async function resumeLightningPaymentAction(
  merchantId: string,
  paymentId: string,
): Promise<LightningActionState> {
  try {
    const session = await requireSession();
    const invoice = await getLightningPaymentForResume(
      session.user.id,
      merchantId,
      paymentId,
    );
    return { ok: true, invoice };
  } catch (error) {
    return fail(error);
  }
}

export async function pollLightningPaymentAction(
  merchantId: string,
  paymentId: string,
): Promise<LightningActionState> {
  try {
    const session = await requireSession();
    const result = await lookupLightningPaymentStatus(
      session.user.id,
      merchantId,
      paymentId,
    );
    if (result.verified) {
      revalidatePath("/payments");
      revalidatePath("/sales");
      revalidatePath("/dashboard");
    }
    return {
      ok: true,
      invoice: result,
      verified: result.verified,
      providerState: result.providerState,
    };
  } catch (error) {
    return fail(error);
  }
}
