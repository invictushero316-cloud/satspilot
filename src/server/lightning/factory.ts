import "server-only";

import { createNwcProvider } from "@/server/lightning/nwc-provider";
import { MockLightningProvider } from "@/server/lightning/mock-provider";
import type { LightningWalletProvider } from "@/server/lightning/types";

/**
 * Create a wallet provider.
 * - `mock` / `LIGHTNING_PROVIDER=mock`: deterministic test/demo mock only.
 * - default: real NWC via @getalby/sdk.
 */
export function createLightningProvider(
  connectionUri: string,
  options?: { forceMock?: boolean },
): LightningWalletProvider {
  const envMode = process.env.LIGHTNING_PROVIDER?.toLowerCase();
  const useMock =
    options?.forceMock === true ||
    envMode === "mock" ||
    connectionUri.startsWith("mock://");

  if (useMock) {
    return new MockLightningProvider();
  }

  if (
    !connectionUri.startsWith("nostr+walletconnect://") &&
    !connectionUri.startsWith("nostrwalletconnect://")
  ) {
    throw new Error("Invalid NWC connection URI scheme");
  }

  return createNwcProvider(connectionUri);
}
