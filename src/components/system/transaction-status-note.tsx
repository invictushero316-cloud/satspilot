"use client";

import { useLocale } from "@/lib/i18n/locale-context";

/** Clarify draft / pending vs server-confirmed settlement. */
export function TransactionStatusNote({
  kind,
}: {
  kind: "draft" | "pending_payment" | "confirmed";
}) {
  const { dictionary } = useLocale();
  const text =
    kind === "draft"
      ? dictionary.reliability.draftNote
      : kind === "pending_payment"
        ? dictionary.reliability.pendingPaymentNote
        : dictionary.reliability.confirmedNote;

  const tone =
    kind === "confirmed"
      ? "border-success/30 bg-success-soft text-success"
      : kind === "pending_payment"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-border bg-surface-muted text-muted-foreground";

  return (
    <p role="status" className={`rounded-lg border px-3 py-2 text-xs ${tone}`}>
      {text}
    </p>
  );
}
