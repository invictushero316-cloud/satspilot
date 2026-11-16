# Lightning receive via Nostr Wallet Connect (NIP-47)

## SDK inspection (`@getalby/sdk`)

Installed package: `@getalby/sdk` (NWCClient from `@getalby/sdk/nwc`).

Methods used by SatsPilot (receive-only):

| NIP-47 method | SDK method | Used? |
| --- | --- | --- |
| `get_info` | `getInfo()` | Yes — capability / network / alias |
| `make_invoice` | `makeInvoice({ amount, description, expiry })` | Yes — create invoice (amount in **msats**) |
| `lookup_invoice` | `lookupInvoice({ payment_hash, invoice })` | Yes — poll settlement |
| `pay_invoice` | `payInvoice(…)` | **Never called** |

Not all wallets support every NIP-47 method. Connect flow **requires** `make_invoice` + `lookup_invoice` via `getInfo().methods`. If the connection also advertises `pay_invoice`, we warn and recommend a receive-only app permission set.

## Architecture

```
Browser ──(auth)──► API / Server Actions
                         │
                         ├─ connect: validate methods → AES-256-GCM store URI
                         ├─ make_invoice → Payment(PENDING) + Sale(SAT)
                         └─ lookup_invoice → verify hash/direction/amount/state
                                              → Payment(SETTLED) + Sale paid
```

- Encryption key: `WALLET_ENCRYPTION_KEY` (separate from `AUTH_SECRET`).
- Provider selection: `LIGHTNING_PROVIDER=mock` or `mock://` URI → deterministic mock (**tests / labeled demo only**). Default = real NWC.
- XOF sales stay separate; Lightning MVP sales are **SAT**-denominated with exact sats/msats.

## Security invariants

1. NWC URI never returned after connect; ciphertext fields stripped from DTOs.
2. No `pay_invoice` / spending path.
3. Client `paid=true` is ignored; settlement only from provider state.
4. Amount, payment hash, and incoming direction must match exactly.
5. Polling is rate-limited and timed out.
6. No merchant Bitcoin private keys are generated or custodied.
