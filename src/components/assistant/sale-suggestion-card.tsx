"use client";

import { Button } from "@/components/ui/button";
import type { AssistantSaleCard } from "@/data/types";
import { formatMoneyXof } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";

export function SaleSuggestionCard({
  card,
  confirming,
  onConfirm,
  onReject,
}: {
  card: AssistantSaleCard;
  confirming: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const { dictionary, locale } = useLocale();
  const canConfirm = card.status === "pending_confirmation";

  return (
    <div className="mt-2 rounded-lg border border-border bg-surface-muted/80 p-3 text-navy">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {canConfirm
          ? dictionary.assistant.saleSuggested
          : dictionary.assistant.saleNeedsClarification}
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {card.lines.map((line, idx) => (
          <li key={`${line.productName}-${idx}`} className="flex justify-between gap-2">
            <span>
              {line.quantity} × {line.productName}
              {line.warnings[0] ? (
                <span className="block text-[11px] text-amber-800">
                  {line.warnings[0]}
                </span>
              ) : null}
            </span>
            <span className="tabular-nums">
              {formatMoneyXof(line.lineTotalXof, locale)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>
          {dictionary.assistant.total}:{" "}
          <strong className="text-navy tabular-nums">
            {formatMoneyXof(card.totalXof, locale)}
          </strong>
        </span>
        <span>
          {dictionary.assistant.method}:{" "}
          {card.paymentMethod === "credit"
            ? dictionary.sale.methods.credit
            : dictionary.sale.methods.cash}
        </span>
        {card.customerName ? (
          <span>
            {dictionary.assistant.customer}: {card.customerName}
          </span>
        ) : null}
      </div>
      {card.clarifyingQuestions.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-900">
          {card.clarifyingQuestions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {canConfirm ? (
          <Button size="sm" loading={confirming} onClick={onConfirm}>
            {dictionary.assistant.confirmSale}
          </Button>
        ) : null}
        <Button size="sm" variant="secondary" onClick={onReject} disabled={confirming}>
          {dictionary.assistant.rejectSale}
        </Button>
      </div>
    </div>
  );
}
