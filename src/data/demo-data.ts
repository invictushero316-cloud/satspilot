/**
 * Labeled UI fixtures for assistant suggestions / empty chat.
 * Authenticated bookkeeping and chat use Postgres + server AI orchestrator.
 */
import type {
  AssistantMessage,
  AssistantSuggestion,
} from "@/data/types";

export const DEMO_BANNER =
  "Authenticated bookkeeping uses Postgres. Assistant suggests only — confirm to save.";

export const demoAssistantSuggestions: AssistantSuggestion[] = [
  { id: "sug_01", promptKey: "assistant.suggestion.todaySales" },
  { id: "sug_02", promptKey: "assistant.suggestion.topDebtors" },
  { id: "sug_03", promptKey: "assistant.suggestion.expenseSummary" },
  { id: "sug_04", promptKey: "assistant.suggestion.weekSales" },
  { id: "sug_05", promptKey: "assistant.suggestion.recordSale" },
];

export const demoAssistantMessages: AssistantMessage[] = [
  {
    id: "msg_01",
    role: "system",
    content:
      "Ask about sales, balances, or expenses — or describe a sale. Nothing is saved until you confirm.",
    createdAt: new Date().toISOString(),
  },
];
