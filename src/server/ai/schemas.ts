import { z } from "zod";

/** Allowlisted read intents the orchestrator may fulfill with server tools. */
export const assistantDataQuerySchema = z.enum([
  "today_sales",
  "week_sales",
  "outstanding_balances",
  "expenses",
  "payment_history",
]);

export type AssistantDataQuery = z.infer<typeof assistantDataQuerySchema>;

/** AI may only propose these — never execute them. */
export const assistantIntentSchema = z.enum([
  "answer",
  "propose_sale",
  "clarify",
  "refuse",
  "fallback",
]);

export const aiSaleLineDraftSchema = z.object({
  /** Product name or description from natural language (untrusted). */
  productQuery: z.string().trim().min(1).max(160),
  quantity: z.number().int().positive().max(10_000),
  /** Optional; ignored when catalog price exists. Never invent FX. */
  unitPriceMinor: z.number().int().nonnegative().max(100_000_000).optional(),
});

export const aiSaleDraftSchema = z.object({
  lines: z.array(aiSaleLineDraftSchema).min(1).max(20),
  customerQuery: z.string().trim().min(1).max(120).optional(),
  paymentMethod: z.enum(["CASH", "CREDIT"]).optional(),
  notes: z.string().trim().max(500).optional(),
});

/**
 * Structured model output. Validated with Zod before any UI / mutation path.
 * Arithmetic in this object is never trusted — server recomputes totals.
 */
export const aiAssistantOutputSchema = z.object({
  intent: assistantIntentSchema,
  reply: z.string().trim().min(1).max(4000),
  locale: z.enum(["en", "fr"]).optional(),
  dataQueries: z.array(assistantDataQuerySchema).max(5).optional(),
  saleDraft: aiSaleDraftSchema.optional(),
  clarifyingQuestions: z.array(z.string().trim().min(1).max(240)).max(5).optional(),
});

export type AiAssistantOutput = z.infer<typeof aiAssistantOutputSchema>;

export const chatRequestSchema = z.object({
  merchantId: z.string().cuid(),
  message: z.string().trim().min(1).max(2000),
  locale: z.enum(["en", "fr"]).optional(),
});

export const confirmSaleSuggestionSchema = z.object({
  merchantId: z.string().cuid(),
  suggestionId: z.string().trim().min(8).max(120),
  idempotencyKey: z.string().trim().min(8).max(120),
  /** Explicit user confirmation flag — must be true. */
  confirmed: z.literal(true),
  lines: z
    .array(
      z.object({
        productId: z.string().cuid().nullable().optional(),
        productName: z.string().trim().min(1).max(160),
        quantity: z.number().int().positive(),
        unitPriceMinor: z.number().int().nonnegative(),
        currency: z.literal("XOF"),
      }),
    )
    .min(1)
    .max(50),
  customerId: z.string().cuid().nullable().optional(),
  paymentMethod: z.enum(["CASH", "CREDIT"]),
  cashPaidMinor: z.number().int().nonnegative().default(0),
  notes: z.string().trim().max(500).optional(),
});

/** Hard-denied action names — AI must never request these. */
export const FORBIDDEN_AI_ACTIONS = [
  "pay_invoice",
  "send_bitcoin",
  "send_payment",
  "reveal_wallet",
  "reveal_nwc",
  "change_permissions",
  "execute_sale",
  "mutate_ledger",
  "delete_merchant",
] as const;
