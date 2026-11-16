/**
 * Deterministic mock Lightning provider for automated tests and labeled demo mode.
 * Real mode must never use this class.
 */
import type {
  LightningInvoiceLookup,
  LightningInvoiceRequest,
  LightningTransaction,
  LightningWalletInfo,
  LightningWalletProvider,
} from "@/server/lightning/types";
import { assertReceiveCapabilities } from "@/server/lightning/types";

export type MockInvoiceScenario =
  | "pending"
  | "settled"
  | "expired"
  | "amount_mismatch"
  | "outgoing"
  | "provider_error";

type StoredInvoice = LightningTransaction & {
  scenario: MockInvoiceScenario;
  lookups: number;
};

function hashFromInvoice(invoice: string): string {
  // Stable fake hash for tests (not cryptographic).
  let h = 0;
  for (let i = 0; i < invoice.length; i += 1) {
    h = (h * 31 + invoice.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(64, "0").slice(0, 64);
}

export class MockLightningProvider implements LightningWalletProvider {
  readonly kind = "mock" as const;
  private readonly invoices = new Map<string, StoredInvoice>();
  private sequence = 0;
  private failNext = false;

  constructor(
    private readonly methods: string[] = [
      "make_invoice",
      "lookup_invoice",
      "get_info",
    ],
    private readonly defaultScenario: MockInvoiceScenario = "settled",
  ) {}

  setFailNext(value: boolean) {
    this.failNext = value;
  }

  async getInfo(): Promise<LightningWalletInfo> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("Mock provider error");
    }
    assertReceiveCapabilities(this.methods);
    return {
      alias: "mock-wallet",
      network: "regtest",
      methods: this.methods,
      lud16: "mock@satspilot.test",
    };
  }

  async makeInvoice(
    request: LightningInvoiceRequest,
  ): Promise<LightningTransaction> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("Mock provider error");
    }
    this.sequence += 1;
    const now = Math.floor(Date.now() / 1000);
    const invoice = `lntb_mock_${this.sequence}_${request.amountMsats}`;
    const paymentHash = hashFromInvoice(invoice);
    const stored: StoredInvoice = {
      type: "incoming",
      state: "pending",
      invoice,
      paymentHash,
      amountMsats: request.amountMsats,
      createdAt: now,
      expiresAt: now + (request.expirySeconds ?? 600),
      settledAt: null,
      description: request.description ?? null,
      scenario: this.defaultScenario,
      lookups: 0,
    };
    this.invoices.set(paymentHash, stored);
    this.invoices.set(invoice, stored);
    return { ...stored };
  }

  async lookupInvoice(
    request: LightningInvoiceLookup,
  ): Promise<LightningTransaction> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("Mock provider error");
    }
    const key = request.paymentHash ?? request.invoice;
    if (!key) throw new Error("paymentHash or invoice required");
    const stored = this.invoices.get(key);
    if (!stored) throw new Error("NOT_FOUND");

    stored.lookups += 1;

    if (stored.scenario === "provider_error" && stored.lookups === 1) {
      throw new Error("Mock transient provider error");
    }

    if (stored.scenario === "expired") {
      stored.state = "expired";
      return { ...stored };
    }

    if (stored.scenario === "outgoing") {
      return { ...stored, type: "outgoing", state: "settled" };
    }

    if (stored.scenario === "amount_mismatch") {
      return {
        ...stored,
        type: "incoming",
        state: "settled",
        amountMsats: stored.amountMsats + 1000,
        settledAt: Math.floor(Date.now() / 1000),
      };
    }

    if (stored.scenario === "pending") {
      stored.state = "pending";
      return { ...stored };
    }

    // settled (default): first lookup pending, second settled — or settle immediately if lookups>=1 for tests that want settle-on-first
    if (stored.lookups === 1 && this.defaultScenario === "settled") {
      // Allow immediate settle for simple tests by settling on first lookup when scenario is settled
      stored.state = "settled";
      stored.settledAt = Math.floor(Date.now() / 1000);
      stored.preimage = "00".repeat(32);
      return { ...stored };
    }

    stored.state = "settled";
    stored.settledAt = Math.floor(Date.now() / 1000);
    stored.preimage = "00".repeat(32);
    return { ...stored };
  }

  /** Test helper: force a stored invoice into a scenario. */
  setScenario(paymentHash: string, scenario: MockInvoiceScenario) {
    const stored = this.invoices.get(paymentHash);
    if (stored) stored.scenario = scenario;
  }

  close(): void {
    this.invoices.clear();
  }
}
