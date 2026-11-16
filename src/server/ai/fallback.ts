import type { AssistantChatResult } from "@/server/ai/types";
import {
  formatXofPlain,
  resolveSaleDraft,
} from "@/server/ai/sale-resolve";
import type { AssistantDataQuery } from "@/server/ai/schemas";

/**
 * Deterministic non-AI router used when the provider is unavailable
 * or returns unusable output. Does not invent metrics — caller supplies data.
 */
export function buildFallbackReply(input: {
  message: string;
  locale: "en" | "fr";
  reason: "unavailable" | "parse_error" | "timeout" | "provider_error";
  dataSummaries?: Partial<Record<AssistantDataQuery, Record<string, unknown>>>;
}): AssistantChatResult {
  const { message, locale, reason } = input;
  const lower = message.toLowerCase();

  const reasonLine =
    locale === "fr"
      ? reason === "unavailable"
        ? "L'assistant IA n'est pas configuré pour le moment."
        : "L'assistant IA est temporairement indisponible."
      : reason === "unavailable"
        ? "The AI assistant is not configured right now."
        : "The AI assistant is temporarily unavailable.";

  const formHint =
    locale === "fr"
      ? "Pour enregistrer une vente sans IA, utilisez le formulaire Vente."
      : "To record a sale without AI, use the New sale form.";

  let intent: AssistantChatResult["intent"] = "fallback";
  let reply = `${reasonLine} ${formHint}`;
  const data: Record<string, unknown> = {};

  if (/aujourd'hui|today|ventes du jour/i.test(lower) && input.dataSummaries?.today_sales) {
    intent = "answer";
    const d = input.dataSummaries.today_sales;
    const gross = Number(d.grossSalesMinor ?? 0);
    const count = Number(d.saleCount ?? 0);
    reply =
      locale === "fr"
        ? `${reasonLine} D'après vos écritures : ${count} vente(s) aujourd'hui, total ${formatXofPlain(gross, "fr")}. ${formHint}`
        : `${reasonLine} From your ledger: ${count} sale(s) today, totaling ${formatXofPlain(gross, "en")}. ${formHint}`;
    data.today_sales = d;
  } else if (/semaine|week/i.test(lower) && input.dataSummaries?.week_sales) {
    intent = "answer";
    const d = input.dataSummaries.week_sales;
    reply =
      locale === "fr"
        ? `${reasonLine} Cette semaine : ${formatXofPlain(Number(d.grossSalesMinor ?? 0), "fr")} de ventes brutes. ${formHint}`
        : `${reasonLine} This week: ${formatXofPlain(Number(d.grossSalesMinor ?? 0), "en")} gross sales. ${formHint}`;
    data.week_sales = d;
  } else if (
    /doit|owe|outstanding|balance|débiteur/i.test(lower) &&
    input.dataSummaries?.outstanding_balances
  ) {
    intent = "answer";
    const d = input.dataSummaries.outstanding_balances;
    reply =
      locale === "fr"
        ? `${reasonLine} Soldes dus : ${formatXofPlain(Number(d.totalOwedMinor ?? 0), "fr")}. ${formHint}`
        : `${reasonLine} Outstanding balances: ${formatXofPlain(Number(d.totalOwedMinor ?? 0), "en")}. ${formHint}`;
    data.outstanding_balances = d;
  }

  return {
    reply,
    intent,
    provider: "fallback",
    saleSuggestion: null,
    data: Object.keys(data).length ? data : null,
    errors: [reason],
    usedFallback: true,
  };
}

/** Keyword-only sale draft when AI is down but the user clearly describes a sale. */
export function tryHeuristicSaleDraft(
  message: string,
  locale: "en" | "fr",
  catalog: {
    products: Array<{
      id: string;
      name: string;
      unitPriceMinor: number;
      currency: string;
    }>;
    customers: Array<{
      id: string;
      name: string;
      balanceOwedMinor: number;
    }>;
  },
) {
  if (!/vendu|vends|sold|sell|sale|acheter/i.test(message)) {
    return null;
  }

  // Very conservative: only if a catalog product name appears in the message.
  const hit = catalog.products.find((p) =>
    message.toLowerCase().includes(p.name.toLowerCase()),
  );
  if (!hit) return null;

  const qtyMatch = message.match(/\b(\d+)\b/);
  const quantity = qtyMatch ? Number.parseInt(qtyMatch[1]!, 10) : 1;
  if (!Number.isInteger(quantity) || quantity < 1) return null;

  return resolveSaleDraft({
    draft: {
      lines: [{ productQuery: hit.name, quantity }],
      paymentMethod: /crédit|credit/i.test(message) ? "CREDIT" : "CASH",
    },
    products: catalog.products,
    customers: catalog.customers,
    locale,
  });
}
