import { allowRateLimited } from "@/server/lightning/rate-limit";
import { AppError } from "@/server/errors";

/** Best-effort client key for rate limiting (IP or auth subject). */
export function clientRateKey(request: Request, fallback: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  return ip || fallback;
}

export function assertRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  message = "Too many requests",
) {
  if (!allowRateLimited(key, limit, windowMs)) {
    throw new AppError("RATE_LIMITED", message, 429);
  }
}
