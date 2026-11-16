"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import {
  connectNwcWallet,
  disconnectNwcWallet,
  getPublicWalletStatus,
} from "@/server/services/wallet";

export type WalletActionState =
  | {
      ok: true;
      warning?: string | null;
      connected?: boolean;
      includesPayInvoice?: boolean;
      capabilities?: string[];
      label?: string | null;
    }
  | { ok: false; error: string };

function fail(error: unknown): WalletActionState {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Unexpected error" };
}

function revalidateWallet(merchantId: string) {
  revalidatePath("/settings");
  revalidatePath("/payments");
  revalidatePath("/payments/receive");
  revalidatePath(`/api/merchants/${merchantId}/wallet`);
}

export async function getWalletStatusAction(
  merchantId: string,
): Promise<WalletActionState> {
  try {
    const session = await requireSession();
    const status = await getPublicWalletStatus(session.user.id, merchantId);
    return {
      ok: true,
      connected: status.connected,
      includesPayInvoice: status.includesPayInvoice,
      capabilities: status.capabilities,
      label: status.label ?? status.connection?.label ?? null,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function connectWalletAction(
  _prev: WalletActionState | null,
  formData: FormData,
): Promise<WalletActionState> {
  try {
    const session = await requireSession();
    const merchantId = String(formData.get("merchantId") ?? "");
    const nwcUri = String(formData.get("nwcUri") ?? "");
    const label = String(formData.get("label") ?? "").trim() || undefined;

    const result = await connectNwcWallet(session.user.id, {
      merchantId,
      nwcUri,
      label,
    });
    revalidateWallet(merchantId);
    return {
      ok: true,
      warning: result.warning,
      connected: true,
      includesPayInvoice: result.includesPayInvoice,
      capabilities: result.capabilities,
      label: result.connection.label,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function disconnectWalletAction(
  _prev: WalletActionState | null,
  formData: FormData,
): Promise<WalletActionState> {
  try {
    const session = await requireSession();
    const merchantId = String(formData.get("merchantId") ?? "");
    await disconnectNwcWallet(session.user.id, merchantId);
    revalidateWallet(merchantId);
    return { ok: true, connected: false };
  } catch (error) {
    return fail(error);
  }
}
