import { createHash, randomBytes } from "node:crypto";

import { computeLineTotal } from "@/server/bookkeeping/money-math";
import { aiSaleDraftSchema } from "@/server/ai/schemas";
import type { ResolvedSaleLine, SaleSuggestion } from "@/server/ai/types";
import type { z } from "zod";

type SaleDraft = z.infer<typeof aiSaleDraftSchema>;

type ProductRow = {
  id: string;
  name: string;
  unitPriceMinor: number;
  currency: string;
};

type CustomerRow = {
  id: string;
  name: string;
  balanceOwedMinor: number;
};

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreNameMatch(query: string, candidate: string): number {
  const q = normalizeName(query);
  const c = normalizeName(candidate);
  if (!q || !c) return 0;
  if (q === c) return 100;
  if (c.includes(q) || q.includes(c)) return 80;
  const qTokens = new Set(q.split(" "));
  const cTokens = c.split(" ");
  let hit = 0;
  for (const t of cTokens) {
    if (qTokens.has(t)) hit += 1;
  }
  if (hit === 0) return 0;
  return Math.min(70, 40 + hit * 15);
}

export function matchProducts(
  productQuery: string,
  products: ProductRow[],
): { matches: ProductRow[]; bestScore: number } {
  const scored = products
    .map((p) => ({ product: p, score: scoreNameMatch(productQuery, p.name) }))
    .filter((x) => x.score >= 40)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { matches: [], bestScore: 0 };

  const bestScore = scored[0]!.score;
  const matches = scored
    .filter((x) => x.score >= bestScore - 5)
    .map((x) => x.product);
  return { matches, bestScore };
}

export function matchCustomers(
  customerQuery: string,
  customers: CustomerRow[],
): { matches: CustomerRow[]; ambiguous: boolean } {
  const scored = customers
    .map((c) => ({ customer: c, score: scoreNameMatch(customerQuery, c.name) }))
    .filter((x) => x.score >= 40)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { matches: [], ambiguous: false };
  const best = scored[0]!.score;
  const matches = scored
    .filter((x) => x.score >= best - 5)
    .map((x) => x.customer);
  return { matches, ambiguous: matches.length > 1 };
}

export function resolveSaleDraft(input: {
  draft: SaleDraft;
  products: ProductRow[];
  customers: CustomerRow[];
  locale?: "en" | "fr";
}): SaleSuggestion {
  const { draft, products, customers, locale = "en" } = input;
  const lines: ResolvedSaleLine[] = [];
  const warnings: string[] = [];
  const clarifyingQuestions: string[] = [];
  let needsClarification = false;

  for (const line of draft.lines) {
    const { matches, bestScore } = matchProducts(line.productQuery, products);
    const lineWarnings: string[] = [];

    if (matches.length === 0) {
      needsClarification = true;
      clarifyingQuestions.push(
        locale === "fr"
          ? `Quel produit correspond à « ${line.productQuery} » ?`
          : `Which product matches “${line.productQuery}”?`,
      );
      lines.push({
        productId: null,
        productName: line.productQuery,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor ?? 0,
        lineTotalMinor: 0,
        currency: "XOF",
        matchStatus: line.unitPriceMinor == null ? "missing_price" : "unmatched",
        warnings: [
          locale === "fr"
            ? "Produit introuvable dans le catalogue."
            : "Product not found in catalog.",
        ],
      });
      continue;
    }

    if (matches.length > 1) {
      needsClarification = true;
      clarifyingQuestions.push(
        locale === "fr"
          ? `Plusieurs produits correspondent à « ${line.productQuery} »: ${matches.map((m) => m.name).join(", ")}. Lequel ?`
          : `Several products match “${line.productQuery}”: ${matches.map((m) => m.name).join(", ")}. Which one?`,
      );
      lines.push({
        productId: null,
        productName: line.productQuery,
        quantity: line.quantity,
        unitPriceMinor: 0,
        lineTotalMinor: 0,
        currency: "XOF",
        matchStatus: "unmatched",
        warnings: ["Ambiguous product match"],
      });
      continue;
    }

    const product = matches[0]!;
    if (product.currency !== "XOF") {
      needsClarification = true;
      lineWarnings.push(
        locale === "fr"
          ? "Seules les ventes XOF sont prises en charge ici."
          : "Only XOF sales are supported here.",
      );
    }

    // Catalog price is authoritative. AI-supplied price is only a hint.
    let unitPriceMinor = product.unitPriceMinor;
    let matchStatus: ResolvedSaleLine["matchStatus"] =
      bestScore >= 100 ? "exact" : "fuzzy";

    if (
      line.unitPriceMinor != null &&
      line.unitPriceMinor !== product.unitPriceMinor
    ) {
      matchStatus = "price_conflict";
      needsClarification = true;
      clarifyingQuestions.push(
        locale === "fr"
          ? `Le prix dit (${line.unitPriceMinor} XOF) ne correspond pas au catalogue (${product.unitPriceMinor} XOF) pour ${product.name}. Quel prix utiliser ?`
          : `Stated price (${line.unitPriceMinor} XOF) conflicts with catalog (${product.unitPriceMinor} XOF) for ${product.name}. Which price should we use?`,
      );
      lineWarnings.push("Conflicting product price — catalog not applied yet.");
      unitPriceMinor = 0;
    }

    const lineTotalMinor =
      matchStatus === "price_conflict"
        ? 0
        : computeLineTotal(line.quantity, unitPriceMinor);

    lines.push({
      productId: matchStatus === "price_conflict" ? product.id : product.id,
      productName: product.name,
      quantity: line.quantity,
      unitPriceMinor,
      lineTotalMinor,
      currency: "XOF",
      matchStatus,
      warnings: lineWarnings,
    });
  }

  let customerId: string | null = null;
  let customerName: string | null = null;
  let customerAmbiguous = false;

  if (draft.customerQuery) {
    const { matches, ambiguous } = matchCustomers(
      draft.customerQuery,
      customers,
    );
    customerAmbiguous = ambiguous;
    if (ambiguous) {
      needsClarification = true;
      clarifyingQuestions.push(
        locale === "fr"
          ? `Plusieurs clients correspondent à « ${draft.customerQuery} »: ${matches.map((m) => m.name).join(", ")}. Lequel ?`
          : `Several customers match “${draft.customerQuery}”: ${matches.map((m) => m.name).join(", ")}. Which one?`,
      );
    } else if (matches.length === 1) {
      customerId = matches[0]!.id;
      customerName = matches[0]!.name;
    } else {
      needsClarification = true;
      clarifyingQuestions.push(
        locale === "fr"
          ? `Client introuvable pour « ${draft.customerQuery} ». Choisissez un client ou créez-en un.`
          : `No customer found for “${draft.customerQuery}”. Pick a customer or create one.`,
      );
    }
  }

  const paymentMethod = draft.paymentMethod ?? "CASH";
  if (paymentMethod === "CREDIT" && !customerId) {
    needsClarification = true;
    clarifyingQuestions.push(
      locale === "fr"
        ? "Une vente à crédit nécessite un client."
        : "A credit sale requires a customer.",
    );
  }

  const totalMinor = lines.reduce((sum, l) => sum + l.lineTotalMinor, 0);
  if (lines.some((l) => l.matchStatus === "missing_price" || l.unitPriceMinor === 0 && l.matchStatus !== "price_conflict")) {
    // missing price for unmatched already flagged
  }

  const idSeed = JSON.stringify({
    lines: draft.lines,
    customerQuery: draft.customerQuery ?? null,
    paymentMethod,
  });
  const suggestionId = `sug_${createHash("sha256").update(idSeed).digest("hex").slice(0, 16)}_${randomBytes(3).toString("hex")}`;

  if (needsClarification) {
    warnings.push(
      locale === "fr"
        ? "Des précisions sont nécessaires avant confirmation."
        : "Clarification is required before confirmation.",
    );
  }

  return {
    id: suggestionId,
    status: needsClarification ? "needs_clarification" : "pending_confirmation",
    lines,
    totalMinor,
    currency: "XOF",
    customerId,
    customerName,
    customerAmbiguous,
    paymentMethod,
    notes: draft.notes ?? null,
    warnings,
    clarifyingQuestions,
  };
}

/** Format ledger numbers for merchant-friendly replies (integers only). */
export function formatXofPlain(amount: number, locale: "en" | "fr"): string {
  const formatted = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} XOF`;
}
