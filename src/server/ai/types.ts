import type { AiAssistantOutput } from "@/server/ai/schemas";

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiCompletionRequest = {
  messages: AiChatMessage[];
  /** Soft max completion tokens. */
  maxTokens: number;
  /** Abort / timeout in ms. */
  timeoutMs: number;
  temperature?: number;
};

export type AiCompletionResult = {
  rawText: string;
  provider: string;
  model: string;
};

export type AiProvider = {
  readonly kind: string;
  isConfigured(): boolean;
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
};

export type ResolvedSaleLine = {
  productId: string | null;
  productName: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  currency: "XOF";
  matchStatus: "exact" | "fuzzy" | "unmatched" | "price_conflict" | "missing_price";
  warnings: string[];
};

export type SaleSuggestion = {
  id: string;
  status: "pending_confirmation" | "needs_clarification";
  lines: ResolvedSaleLine[];
  totalMinor: number;
  currency: "XOF";
  customerId: string | null;
  customerName: string | null;
  customerAmbiguous: boolean;
  paymentMethod: "CASH" | "CREDIT";
  notes: string | null;
  warnings: string[];
  clarifyingQuestions: string[];
};

export type AssistantChatResult = {
  reply: string;
  intent: AiAssistantOutput["intent"];
  provider: "openai" | "mock" | "none" | "fallback";
  saleSuggestion: SaleSuggestion | null;
  data: Record<string, unknown> | null;
  errors: string[];
  usedFallback: boolean;
};
