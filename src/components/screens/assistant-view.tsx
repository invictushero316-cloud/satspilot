"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { SaleSuggestionCard } from "@/components/assistant/sale-suggestion-card";
import { AppShell } from "@/components/layout/app-shell";
import { ServiceOutageBanner } from "@/components/system/service-outage-banner";
import { TransactionStatusNote } from "@/components/system/transaction-status-note";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type {
  AssistantMessage,
  AssistantSaleCard,
  AssistantSuggestion,
  Merchant,
} from "@/data/types";
import { createIdempotencyKey } from "@/lib/idempotency-client";
import { useLocale } from "@/lib/i18n/locale-context";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  chatAssistantAction,
  confirmAssistantSaleAction,
} from "@/server/actions/assistant";
import type { SaleSuggestion } from "@/server/ai/types";

function toSaleCard(suggestion: SaleSuggestion): AssistantSaleCard {
  return {
    id: suggestion.id,
    status: suggestion.status,
    lines: suggestion.lines.map((l) => ({
      productId: l.productId,
      productName: l.productName,
      quantity: l.quantity,
      unitPriceXof: l.unitPriceMinor,
      lineTotalXof: l.lineTotalMinor,
      matchStatus: l.matchStatus,
      warnings: l.warnings,
    })),
    totalXof: suggestion.totalMinor,
    customerId: suggestion.customerId,
    customerName: suggestion.customerName,
    customerAmbiguous: suggestion.customerAmbiguous,
    paymentMethod: suggestion.paymentMethod === "CREDIT" ? "credit" : "cash",
    notes: suggestion.notes,
    warnings: suggestion.warnings,
    clarifyingQuestions: suggestion.clarifyingQuestions,
  };
}

function cardToSuggestion(card: AssistantSaleCard): SaleSuggestion {
  return {
    id: card.id,
    status: card.status,
    lines: card.lines.map((l) => ({
      productId: l.productId,
      productName: l.productName,
      quantity: l.quantity,
      unitPriceMinor: l.unitPriceXof,
      lineTotalMinor: l.lineTotalXof,
      currency: "XOF",
      matchStatus: l.matchStatus as SaleSuggestion["lines"][number]["matchStatus"],
      warnings: l.warnings,
    })),
    totalMinor: card.totalXof,
    currency: "XOF",
    customerId: card.customerId,
    customerName: card.customerName,
    customerAmbiguous: card.customerAmbiguous,
    paymentMethod: card.paymentMethod === "credit" ? "CREDIT" : "CASH",
    notes: card.notes,
    warnings: card.warnings,
    clarifyingQuestions: card.clarifyingQuestions,
  };
}

export function AssistantView({
  merchants,
  activeMerchantId,
  suggestions,
  initialMessages,
  aiConfigured,
}: {
  merchants: Merchant[];
  activeMerchantId: string;
  suggestions: AssistantSuggestion[];
  initialMessages: AssistantMessage[];
  aiConfigured: boolean;
}) {
  const { dictionary, locale } = useLocale();
  const { push } = useToast();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const seq = useRef(0);

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || loading) return;
    seq.current += 1;
    const userMessage: AssistantMessage = {
      id: `user_${seq.current}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setLoading(true);

    const result = await chatAssistantAction({
      merchantId: activeMerchantId,
      message: trimmed,
      locale,
    });

    seq.current += 1;
    if (!result.ok) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant_${seq.current}`,
          role: "assistant",
          content: result.error,
          createdAt: new Date().toISOString(),
          meta: { intent: "fallback", usedFallback: true },
        },
      ]);
      setLoading(false);
      return;
    }

    const saleCard = result.result.saleSuggestion
      ? toSaleCard(result.result.saleSuggestion)
      : null;

    setMessages((prev) => [
      ...prev,
      {
        id: `assistant_${seq.current}`,
        role: "assistant",
        content: result.result.reply,
        createdAt: new Date().toISOString(),
        saleCard,
        meta: {
          intent: result.result.intent,
          provider: result.result.provider,
          usedFallback: result.result.usedFallback,
        },
      },
    ]);
    setLoading(false);
  }

  async function onConfirm(messageId: string, card: AssistantSaleCard) {
    setConfirmingId(card.id);
    const result = await confirmAssistantSaleAction({
      merchantId: activeMerchantId,
      suggestion: cardToSuggestion(card),
      idempotencyKey: createIdempotencyKey(`ai-sale-${card.id}`),
      confirmed: true,
    });
    setConfirmingId(null);

    if (!result.ok) {
      push(result.error, "danger");
      return;
    }

    push(dictionary.assistant.saleConfirmed, "success");
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              saleCard: null,
              content: `${m.content}\n\n✓ ${dictionary.assistant.saleConfirmed}`,
            }
          : m,
      ),
    );
  }

  function onReject(messageId: string) {
    push(dictionary.assistant.saleRejected, "info");
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, saleCard: null } : m,
      ),
    );
  }

  return (
    <AppShell
      titleKey="assistant.title"
      merchants={merchants}
      activeMerchantId={activeMerchantId}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{dictionary.assistant.title}</CardTitle>
            <CardDescription>{dictionary.assistant.disclaimer}</CardDescription>
          </CardHeader>

          {!aiConfigured ? (
            <div className="mb-3 space-y-2">
              <ServiceOutageBanner kind="ai" />
              <p className="text-xs text-muted-foreground">
                {dictionary.assistant.providerUnavailable}
              </p>
            </div>
          ) : null}
          <div className="mb-3">
            <TransactionStatusNote kind="draft" />
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/sales/new?merchantId=${activeMerchantId}`}
              className="pressable inline-flex h-9 items-center justify-center rounded-xl border border-border bg-white px-3 text-xs font-medium text-navy"
            >
              {dictionary.assistant.fallbackForm}
            </Link>
            <span className="text-[11px] text-muted-foreground">
              {dictionary.assistant.fallbackFormHint}
            </span>
          </div>

          <div className="mb-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {dictionary.assistant.suggestions}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  disabled={loading}
                  className="pressable rounded-xl border border-border bg-white px-3 py-2 text-left text-xs font-medium text-navy hover:bg-navy-soft/70 disabled:opacity-60"
                  onClick={() =>
                    void send(
                      t(dictionary, suggestion.promptKey, suggestion.promptKey),
                    )
                  }
                >
                  {t(dictionary, suggestion.promptKey, suggestion.promptKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex max-h-[50vh] flex-col gap-2.5 overflow-y-auto rounded-2xl border border-border/60 bg-gradient-to-b from-surface-muted/80 to-white/40 p-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[95%] rounded-2xl px-3.5 py-2.5 text-sm animate-fade-up shadow-sm",
                  message.role === "user" && "ml-auto bg-navy text-white",
                  message.role === "assistant" &&
                    "bg-white text-navy ring-1 ring-border/70",
                  message.role === "system" && "bg-amber-50 text-amber-950",
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
                {message.saleCard ? (
                  <SaleSuggestionCard
                    card={message.saleCard}
                    confirming={confirmingId === message.saleCard.id}
                    onConfirm={() => void onConfirm(message.id, message.saleCard!)}
                    onReject={() => onReject(message.id)}
                  />
                ) : null}
              </div>
            ))}
            {loading ? (
              <div
                className="flex w-fit items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-xs text-muted-foreground ring-1 ring-border/70 animate-fade-in"
                role="status"
                aria-live="polite"
              >
                <span className="flex gap-1" aria-hidden>
                  <span className="size-1.5 animate-pulse rounded-full bg-navy/50" />
                  <span className="size-1.5 animate-pulse rounded-full bg-navy/40 [animation-delay:150ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-navy/30 [animation-delay:300ms]" />
                </span>
                {dictionary.common.loading}
              </div>
            ) : null}
          </div>

          <form
            className="mt-3 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={dictionary.assistant.placeholder}
              rows={3}
            />
            <Button type="submit" className="w-full" loading={loading}>
              {dictionary.assistant.send}
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
