/** Browser-safe idempotency key for form / API submissions. */
export function createIdempotencyKey(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${rand}`;
}

/** @deprecated Prefer createIdempotencyKey — alias kept for clarity at call sites. */
export const createClientIdempotencyKey = createIdempotencyKey;
