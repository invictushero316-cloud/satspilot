import {
  aiAssistantOutputSchema,
  type AiAssistantOutput,
} from "@/server/ai/schemas";

export type ParseResult =
  | { ok: true; data: AiAssistantOutput }
  | { ok: false; error: string; raw: string };

/** Extract JSON object from model text (tolerates fenced code blocks). */
export function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence?.[1]?.trim() ?? trimmed;

  if (candidate.startsWith("{") && candidate.endsWith("}")) {
    return candidate;
  }

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return candidate.slice(start, end + 1);
  }
  return null;
}

export function parseAssistantOutput(raw: string): ParseResult {
  const jsonText = extractJsonObject(raw);
  if (!jsonText) {
    return { ok: false, error: "Model response was not valid JSON", raw };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "Malformed JSON from model", raw };
  }

  const validated = aiAssistantOutputSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      ok: false,
      error: "Structured output failed Zod validation",
      raw,
    };
  }

  return { ok: true, data: validated.data };
}
