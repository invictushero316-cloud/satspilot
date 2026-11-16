# Devpost / hackathon pitch

## Elevator pitch (≤500 characters)

SatsPilot helps small West African merchants record sales, accept Lightning via Nostr Wallet Connect, and ask an AI about their own ledger — on a phone, in French or English. Payments settle only after server-side `lookup_invoice`. Receipts are privacy-preserving Nostr attestations. Open source (MIT).

## Short description

**SatsPilot** is an open-source, mobile-first business console for kiosks and market shops:

- Cash & credit bookkeeping with integer money math (XOF bookkeeping separate from sats — no invented FX)
- Real Lightning **receive** through NWC (NIP-47), encrypted credentials, receive-only methods preferred
- Signed digital receipts (canonical hash + Nostr signature) with public verify **without** customer PII
- AI assistant that answers from the merchant’s ledger and may **suggest** sales — never pays invoices or mutates without confirm

Built with Next.js, Postgres, Auth.js, `@getalby/sdk`, and `nostr-tools`.

## Problem

Small merchants lose hours to paper books, struggle to offer Bitcoin Lightning safely, and cannot get trustworthy insights without giving an AI the keys to their wallet.

## Solution

A single progressive web app: record the sale, show a Lightning QR when wanted, settle only on verified invoice lookup, issue a signed receipt, and ask “how were today’s sales?” with allowlisted tools.

## What judges can run

```bash
npm run demo
# Login: merchant.demo@satspilot.local / DemoMerchant1!
```

See [demo-script.md](./demo-script.md) for a timed 3-minute walkthrough.

## Honesty note

Compose demo Lightning uses a **labeled mock provider** so settlement is reproducible without wallet credentials. Live NWC two-wallet verification is documented and **outstanding** until credentials are available: [lightning-nwc-manual-test.md](./lightning-nwc-manual-test.md).

## Links

- README · Architecture · Security review · Impact (measured vs projected) · MIT LICENSE
