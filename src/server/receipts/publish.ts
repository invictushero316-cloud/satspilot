import "server-only";

import type { Event } from "nostr-tools/pure";
import { Relay } from "nostr-tools/relay";

import { AppError } from "@/server/errors";
import { allowRateLimited } from "@/server/lightning/rate-limit";

/**
 * Publish a minimal receipt attestation to a relay.
 * Caller must enforce merchant opt-in. Event must contain no PII.
 */
export async function publishReceiptEvent(input: {
  event: Event;
  relayUrl: string;
  timeoutMs?: number;
}): Promise<{ ok: true; relayUrl: string } | { ok: false; error: string }> {
  const relayUrl = input.relayUrl.trim();
  if (!/^wss:\/\//i.test(relayUrl)) {
    throw new AppError("VALIDATION_ERROR", "Relay URL must use wss://", 400);
  }

  if (!allowRateLimited(`nostr-publish:${input.event.pubkey}`, 10, 60_000)) {
    throw new AppError("RATE_LIMITED", "Too many relay publish attempts", 429);
  }

  // Safety: refuse publish if content looks like it contains secrets / PII markers.
  const blob = `${input.event.content}${JSON.stringify(input.event.tags)}`.toLowerCase();
  if (
    blob.includes("nostr+walletconnect") ||
    blob.includes("nsec1") ||
    blob.includes("phone") ||
    blob.includes("balance")
  ) {
    throw new AppError(
      "PRIVACY_BLOCK",
      "Refusing to publish event that appears to contain sensitive data",
      400,
    );
  }

  const timeoutMs = input.timeoutMs ?? 12_000;
  let relay: Relay | null = null;

  try {
    relay = await Promise.race([
      Relay.connect(relayUrl),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("relay connect timeout")), timeoutMs),
      ),
    ]);

    await Promise.race([
      relay.publish(input.event),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("relay publish timeout")), timeoutMs),
      ),
    ]);

    return { ok: true, relayUrl };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "relay publish failed",
    };
  } finally {
    try {
      relay?.close();
    } catch {
      // ignore
    }
  }
}

export function defaultReceiptRelayUrl(): string {
  return (
    process.env.NOSTR_RECEIPT_RELAY_URL?.trim() ||
    "wss://relay.damus.io"
  );
}
