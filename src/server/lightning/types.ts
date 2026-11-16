/** Provider-agnostic Lightning receive types (NIP-47 aligned). */

export const REQUIRED_NWC_METHODS = ["make_invoice", "lookup_invoice"] as const;

export type RequiredNwcMethod = (typeof REQUIRED_NWC_METHODS)[number];

export type LightningInvoiceRequest = {
  /** Amount in millisatoshis (NIP-47). */
  amountMsats: number;
  description?: string;
  /** Expiry in seconds from creation. */
  expirySeconds?: number;
};

export type LightningInvoiceLookup = {
  paymentHash?: string;
  invoice?: string;
};

export type LightningTransactionState =
  | "pending"
  | "settled"
  | "failed"
  | "accepted"
  | "expired"
  | "unknown";

export type LightningTransaction = {
  type: "incoming" | "outgoing";
  state: LightningTransactionState;
  invoice: string;
  paymentHash: string;
  /** Amount in msats. */
  amountMsats: number;
  preimage?: string | null;
  createdAt?: number | null;
  expiresAt?: number | null;
  settledAt?: number | null;
  description?: string | null;
};

export type LightningWalletInfo = {
  alias?: string | null;
  network?: string | null;
  methods: string[];
  lud16?: string | null;
};

export type LightningWalletProvider = {
  readonly kind: "nwc" | "mock";
  getInfo(): Promise<LightningWalletInfo>;
  makeInvoice(request: LightningInvoiceRequest): Promise<LightningTransaction>;
  lookupInvoice(request: LightningInvoiceLookup): Promise<LightningTransaction>;
  close(): void;
};

export function assertReceiveCapabilities(methods: string[]): {
  ok: true;
  includesPayInvoice: boolean;
} {
  const normalized = methods.map((m) => m.trim().toLowerCase());
  for (const required of REQUIRED_NWC_METHODS) {
    if (!normalized.includes(required)) {
      throw new Error(
        `Wallet connection is missing required NIP-47 method: ${required}`,
      );
    }
  }
  return {
    ok: true,
    includesPayInvoice: normalized.includes("pay_invoice"),
  };
}
