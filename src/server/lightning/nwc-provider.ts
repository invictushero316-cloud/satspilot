import "server-only";

import { NWCClient } from "@getalby/sdk/nwc";

import type {
  LightningInvoiceLookup,
  LightningInvoiceRequest,
  LightningTransaction,
  LightningWalletInfo,
  LightningWalletProvider,
} from "@/server/lightning/types";
import { assertReceiveCapabilities } from "@/server/lightning/types";

function ensureNodePolyfills() {
  // Required by @getalby/sdk websocket transport on Node.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("websocket-polyfill");
}

function mapTransaction(tx: {
  type: "incoming" | "outgoing";
  state?: string | null;
  invoice?: string | null;
  payment_hash?: string | null;
  amount?: number | null;
  preimage?: string | null;
  created_at?: number | null;
  expires_at?: number | null;
  settled_at?: number | null;
  description?: string | null;
}): LightningTransaction {
  const stateRaw = (tx.state ?? "pending").toLowerCase();
  const state =
    stateRaw === "settled" ||
    stateRaw === "pending" ||
    stateRaw === "failed" ||
    stateRaw === "accepted" ||
    stateRaw === "expired"
      ? stateRaw
      : "unknown";

  if (!tx.invoice || !tx.payment_hash || tx.amount == null) {
    throw new Error("NWC response missing invoice, payment_hash, or amount");
  }

  return {
    type: tx.type,
    state,
    invoice: tx.invoice,
    paymentHash: tx.payment_hash,
    amountMsats: tx.amount,
    preimage: tx.preimage,
    createdAt: tx.created_at,
    expiresAt: tx.expires_at,
    settledAt: tx.settled_at,
    description: tx.description,
  };
}

/**
 * Real NWC provider using @getalby/sdk NWCClient.
 * Supported receive methods used here: getInfo, makeInvoice, lookupInvoice.
 * payInvoice is intentionally never called.
 */
export class NwcLightningProvider implements LightningWalletProvider {
  readonly kind = "nwc" as const;
  private readonly client: NWCClient;

  constructor(nostrWalletConnectUrl: string) {
    ensureNodePolyfills();
    this.client = new NWCClient({ nostrWalletConnectUrl });
  }

  async getInfo(): Promise<LightningWalletInfo> {
    const info = await this.client.getInfo();
    const methods = info.methods ?? [];
    assertReceiveCapabilities(methods);
    return {
      alias: info.alias,
      network: info.network,
      methods,
      lud16: info.lud16 ?? this.client.lud16,
    };
  }

  async makeInvoice(
    request: LightningInvoiceRequest,
  ): Promise<LightningTransaction> {
    const result = await this.client.makeInvoice({
      amount: request.amountMsats,
      description: request.description,
      expiry: request.expirySeconds,
    });
    return mapTransaction(result);
  }

  async lookupInvoice(
    request: LightningInvoiceLookup,
  ): Promise<LightningTransaction> {
    if (!request.paymentHash && !request.invoice) {
      throw new Error("lookupInvoice requires paymentHash or invoice");
    }
    const result = await this.client.lookupInvoice({
      payment_hash: request.paymentHash,
      invoice: request.invoice,
    });
    return mapTransaction(result);
  }

  close(): void {
    this.client.close();
  }
}

export function createNwcProvider(
  nostrWalletConnectUrl: string,
): LightningWalletProvider {
  return new NwcLightningProvider(nostrWalletConnectUrl);
}
