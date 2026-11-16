import "server-only";

import type { AiCompletionRequest, AiCompletionResult, AiProvider } from "@/server/ai/types";
import { AppError } from "@/server/errors";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getAiRuntimeConfig() {
  return {
    provider: (process.env.AI_PROVIDER ?? "none").toLowerCase(),
    apiKey: process.env.AI_API_KEY?.trim() || "",
    model: process.env.AI_MODEL?.trim() || "gpt-4o-mini",
    baseUrl: (process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(
      /\/$/,
      "",
    ),
    timeoutMs: envInt("AI_TIMEOUT_MS", 20_000),
    maxTokens: envInt("AI_MAX_TOKENS", 800),
    maxInputChars: envInt("AI_MAX_INPUT_CHARS", 4000),
  };
}

/**
 * OpenAI-compatible chat completions adapter (server-side only).
 * Works with OpenAI or any base URL that speaks the same API shape.
 */
export class OpenAiCompatibleProvider implements AiProvider {
  readonly kind = "openai";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    if (!this.isConfigured()) {
      throw new AppError("AI_UNAVAILABLE", "AI provider is not configured", 503);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens,
          response_format: { type: "json_object" },
          messages: request.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new AppError(
          "AI_PROVIDER_ERROR",
          `AI provider error (${response.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
          502,
        );
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rawText = json.choices?.[0]?.message?.content?.trim() ?? "";
      if (!rawText) {
        throw new AppError("AI_PROVIDER_ERROR", "AI provider returned empty content", 502);
      }

      return { rawText, provider: this.kind, model: this.model };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError("AI_TIMEOUT", "AI provider timed out", 504);
      }
      throw new AppError(
        "AI_PROVIDER_ERROR",
        error instanceof Error ? error.message : "AI provider failed",
        502,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Deterministic mock provider for automated tests and labeled demo mode.
 * Never used as a stand-in for live financial truth.
 */
export class MockAiProvider implements AiProvider {
  readonly kind = "mock";

  isConfigured(): boolean {
    return true;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const lastUser =
      [...request.messages].reverse().find((m) => m.role === "user")?.content ??
      "";
    const lower = lastUser.toLowerCase();

    let payload: Record<string, unknown>;

    if (
      /ignore (all |previous )?instructions|reveal.*(wallet|nwc|secret)|pay[_ ]invoice|send bitcoin|change permissions/i.test(
        lastUser,
      )
    ) {
      payload = {
        intent: "refuse",
        reply:
          "I cannot change permissions, reveal wallet credentials, or send Bitcoin. I only help with bookkeeping questions and sale suggestions that you confirm.",
        locale: "en",
      };
    } else if (
      /aujourd'hui|ventes du jour|today'?s sales|how were today/i.test(lower)
    ) {
      payload = {
        intent: "answer",
        reply: "Here are today's sales from your ledger.",
        locale: /aujourd|ventes du jour/i.test(lower) ? "fr" : "en",
        dataQueries: ["today_sales"],
      };
    } else if (/semaine|this week|weekly/i.test(lower)) {
      payload = {
        intent: "answer",
        reply: "Here is your weekly sales summary from stored transactions.",
        dataQueries: ["week_sales"],
      };
    } else if (/doit|owe|outstanding|balance|débiteur|debt/i.test(lower)) {
      payload = {
        intent: "answer",
        reply: "Here are customers with outstanding balances.",
        dataQueries: ["outstanding_balances"],
      };
    } else if (/dépense|expense/i.test(lower)) {
      payload = {
        intent: "answer",
        reply: "Here are recent expenses from your books.",
        dataQueries: ["expenses"],
      };
    } else if (/paiement|payment history|historique/i.test(lower)) {
      payload = {
        intent: "answer",
        reply: "Here is recent payment history.",
        dataQueries: ["payment_history"],
      };
    } else if (
      /vendu|sold|vends|sell|sale|acheter|2 (sacs|bags)|trois|three/i.test(lower)
    ) {
      const fr = /vendu|vends|sacs|acheter|trois/i.test(lower);
      payload = {
        intent: "propose_sale",
        reply: fr
          ? "J'ai compris une vente. Vérifiez les détails puis confirmez."
          : "I understood a sale. Please review the details, then confirm.",
        locale: fr ? "fr" : "en",
        saleDraft: {
          lines: [
            {
              productQuery: fr ? "riz" : "rice",
              quantity: /trois|three|3\b/i.test(lower)
                ? 3
                : /2\b|deux|two/i.test(lower)
                  ? 2
                  : 1,
            },
          ],
          paymentMethod: /crédit|credit|à crédit|on account/i.test(lower)
            ? "CREDIT"
            : "CASH",
          customerQuery: /amina|ibrahim|awa/i.test(lower)
            ? (lastUser.match(/amina|ibrahim|awa/i)?.[0] ?? undefined)
            : undefined,
        },
      };
    } else if (/not.?json|malformed/i.test(lower)) {
      return {
        rawText: "this is not json {{{",
        provider: this.kind,
        model: "mock",
      };
    } else {
      payload = {
        intent: "clarify",
        reply:
          "I can answer sales, balances, expenses, and payment questions, or suggest a sale for you to confirm. What would you like to do?",
        clarifyingQuestions: [
          "Ask about today's sales, outstanding balances, expenses, or describe a sale to record.",
        ],
      };
    }

    return {
      rawText: JSON.stringify(payload),
      provider: this.kind,
      model: "mock",
    };
  }
}

export function createAiProvider(options?: {
  forceMock?: boolean;
}): AiProvider {
  const cfg = getAiRuntimeConfig();
  if (options?.forceMock || cfg.provider === "mock") {
    return new MockAiProvider();
  }
  if (cfg.provider === "none" || cfg.provider === "off" || !cfg.apiKey) {
    return new OpenAiCompatibleProvider("", cfg.model, cfg.baseUrl);
  }
  if (cfg.provider === "openai" || cfg.provider === "compatible") {
    return new OpenAiCompatibleProvider(cfg.apiKey, cfg.model, cfg.baseUrl);
  }
  // Unknown provider name with a key — still try OpenAI-compatible endpoint.
  if (cfg.apiKey) {
    return new OpenAiCompatibleProvider(cfg.apiKey, cfg.model, cfg.baseUrl);
  }
  return new OpenAiCompatibleProvider("", cfg.model, cfg.baseUrl);
}
