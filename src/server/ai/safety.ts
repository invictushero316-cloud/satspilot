import { FORBIDDEN_AI_ACTIONS } from "@/server/ai/schemas";

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(your\s+)?(system|safety)\s+(prompt|rules)/i,
  /you\s+are\s+now\s+(unrestricted|jailbroken|developer\s+mode)/i,
  /reveal\s+(the\s+)?(system\s+prompt|hidden\s+instructions)/i,
  /exfiltrat(e|ion)/i,
];

const FORBIDDEN_REQUEST_PATTERNS: RegExp[] = [
  /pay[_ ]?invoice/i,
  /send\s+(bitcoin|btc|sats|lightning)/i,
  /transfer\s+funds/i,
  /reveal\s+(nwc|wallet|seed|mnemonic|private\s*key|api\s*key)/i,
  /show\s+(me\s+)?(the\s+)?(nwc|wallet\s+secret|encryption\s+key)/i,
  /change\s+(my\s+)?(permissions|roles?|access)/i,
  /grant\s+(admin|owner)\s+access/i,
  /execute\s+(the\s+)?sale\s+without\s+confirm/i,
  /skip\s+confirmation/i,
];

export function detectPromptInjection(message: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(message));
}

export function detectForbiddenRequest(message: string): boolean {
  return FORBIDDEN_REQUEST_PATTERNS.some((re) => re.test(message));
}

export function sanitizeUserMessage(message: string, maxChars: number): string {
  // Strip control chars except newlines/tabs; treat as untrusted text.
  const cleaned = message
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  if (cleaned.length <= maxChars) return cleaned;
  return cleaned.slice(0, maxChars);
}

export function containsForbiddenActionName(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_AI_ACTIONS.some((action) => lower.includes(action));
}

/** Redact phone-like and secret-looking tokens before sending context to the model. */
export function redactForAiContext(value: string): string {
  return value
    .replace(/\+?\d[\d\s\-()]{7,}\d/g, "[phone]")
    .replace(/nostr\+walletconnect:\/\/\S+/gi, "[redacted-nwc]")
    .replace(/sk-[a-zA-Z0-9]{10,}/g, "[redacted-key]");
}
