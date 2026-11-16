# SatsPilot Architecture

Hackathon build for an open-source, AI-powered Bitcoin Lightning business assistant aimed at low-bandwidth, mobile-first small merchants.

## Goals

- Record sales quickly on mid-range Android phones
- Accept **real** Lightning payments via Nostr Wallet Connect (NIP-47)
- Track customer balances (tabs) with integer accounting
- Surface business performance insights via a **read-only** AI assistant
- Ship with English + French localization architecture

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js App Router, TypeScript (strict) |
| UI | Tailwind CSS v4, accessible mobile-first console |
| Data | PostgreSQL + Prisma 6 |
| Auth | Auth.js v5 (Credentials + JWT sessions, Prisma adapter models) |
| Lightning | NWC (NIP-47) via `@getalby/sdk` NWCClient (server-side receive-only) |
| Nostr | `nostr-tools` (receipt attestations; no customer PII in public events) |
| AI | Configurable **server-side** provider (OpenAI-compatible / none / mock) |
| Tests | Vitest (authz/validation/redaction/settlement), Playwright happy-path |
| Ops | Docker Compose (Postgres + app), GitHub Actions CI |

## Repository layout

```
src/app/           # App Router pages and route handlers
src/auth.ts        # Auth.js configuration
src/proxy.ts       # Next.js 16 auth redirect gate
src/components/    # UI
src/lib/           # Shared pure helpers, i18n
src/server/        # Server-only modules (DB, authz, crypto, actions)
prisma/            # Schema, migrations, seed
tests/             # Vitest unit/security tests
docs/              # Architecture and product docs
```

## Module boundaries

### 1. Merchant identity & authorization

- Auth.js sessions identify a user (`session.user.id`).
- `MerchantMembership` links users to merchants with roles (`OWNER` | `MEMBER`).
- `requireMerchantMembership(userId, merchantId)` always loads membership from the database.
- A client-supplied merchant ID is **never** sufficient proof of access.
- Proxy redirects unauthenticated users; Server Components / actions / API routes re-check authz.

### 2. Sales & ledger (domain)

- Sales, line items, payments, expenses, and customer ledger entries live in Postgres.
- **Integer amounts only**: sats / msats for Lightning; minor units for fiat bookkeeping.
- **XOF bookkeeping amounts are distinct from satoshi amounts.** Do not invent FX rates.
- `Sale.status` and `Payment.status` are independent enums.
- `CustomerLedgerEntry` rows are append-only (immutable money movements).
- Payments support `idempotencyKey` and unique `paymentHash`.

### 3. Lightning payments (NWC)

- NWC connection material is stored only as AES-256-GCM ciphertext (`WalletConnection`).
- Encryption keys (`WALLET_ENCRYPTION_KEY`) are env-managed and versioned separately from `AUTH_SECRET`.
- Public DTOs use `toPublicWalletConnection` / `redactSecrets` — never return ciphertext or plaintext secrets.
- Required wallet methods: `make_invoice` + `lookup_invoice` (validated on connect and before use).
- Prefer receive-only NWC permissions; `pay_invoice` is never called.
- Invoice create + authenticated `lookup_invoice` polling; sale ledger updates only after verified incoming settlement (hash, direction, amount, state).
- SAT-denominated Lightning sales are separate from XOF bookkeeping (no invented FX).
- See [lightning-nwc.md](./lightning-nwc.md) and [lightning-nwc-manual-test.md](./lightning-nwc-manual-test.md).

### 4. AI assistant

- Server-side OpenAI-compatible adapter (`AI_PROVIDER` / `AI_API_KEY`) with timeouts, token budgets, and rate limits.
- Structured JSON output validated with Zod; allowlisted read tools only.
- Natural-language sale suggestions (EN/FR) become confirmation cards — ledger writes require explicit user confirmation.
- Deterministic sale matching + integer totals in server code (never trust model arithmetic).
- Hard deny: pay invoices, send Bitcoin, reveal wallet/NWC secrets, change permissions.
- Non-AI fallback: keyword/ledger answers when possible + link to New sale form.
- Chat: `POST /api/merchants/[merchantId]/assistant/chat` + server actions.

### 5. Localization

- `en` and `fr` dictionaries under `src/lib/i18n`.
- Merchant `locale` is stored on the merchant profile.

## Data classification

| Class | Examples | Rules |
| --- | --- | --- |
| Public | Marketing copy, health status | Safe for CDN / client |
| Merchant-private | Sales, customers, balances | Authz + TLS |
| Secret | `AUTH_SECRET`, AI keys, NWC URIs, `WALLET_ENCRYPTION_KEY` | Env / encrypted store; never client, never logs |
| Payment evidence | Invoice hashes, settle timestamps | Server-verified only |

## Security invariants

1. Never expose wallet connection secrets, signing keys, or AI API keys to the browser or logs.
2. Never pretend a payment succeeded.
3. AI cannot control spending or execute payments.
4. Server-side validation (Zod) + merchant-specific authorization on every write/read of merchant data.
5. No financial credentials in sample code, commits, or test fixtures (seed uses encrypted placeholder only).

## Milestone status

**Step 1:** Next.js scaffold, Tailwind, `/api/health`, docs.

**Step 2:** Mobile-first merchant UI with EN/FR dictionaries.

**Step 3:** Prisma models + migrations, Auth.js login/logout/register, merchant onboarding, membership authz, encrypted wallet columns, gated demo seed, security unit tests.

**Step 4:** Real merchant bookkeeping — product CRUD (+ optional stock), multi-item sales, cash payments, expenses, customers, partial repayments, filtered histories, analytics from stored transactions. Integer money math, DB transactions, idempotency keys.

**Step 5:** Lightning receive via NWC — wallet settings, encrypted credential storage, capability checks, SAT invoices (`make_invoice`), QR/BOLT11, authenticated `lookup_invoice` polling, verified settlement → sale ledger.

**Step 6:** AI merchant assistant — configurable provider, Zod structured output, EN/FR sale suggestions with confirmation cards, allowlisted ledger Q&A, prompt-injection defenses, non-AI sale form fallback.

**Step 7:** Privacy-preserving signed receipts — canonical hash, server-managed Nostr signing identity (no nsec paste), customer QR/token view, public verification without PII, optional relay publish behind merchant opt-in. See [receipts-nostr.md](./receipts-nostr.md).

**Hackathon packaging:** Docker Compose app+Postgres, `npm run demo`, security/threat docs, CI, MIT license, demo script.

**Not yet:** Production OAuth/MFA, XOF↔sats conversion policy, field pilot metrics, live NWC verification in CI (manual checklist only).
