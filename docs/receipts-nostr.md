# Privacy-preserving signed receipts (Nostr)

SatsPilot issues a **canonical digital receipt** for each finalized sale, computes an **integrity hash**, and signs it with a **server-managed merchant Nostr key** using `nostr-tools` (NIP-01 event structure + signature verification).

## What is signed

1. Build a canonical JSON document (deterministic key ordering) containing:
   - `publicId` (random)
   - `saleDigest` (hash of sale id — not a customer id)
   - merchant pubkey
   - issued timestamp
   - currency, total, line items (product name / qty / prices)
2. `integrityHash = SHA-256(canonicalJson)`
3. Create a NIP-01 event (kind `31234`, parameterized replaceable):
   - `content` = integrity hash only
   - tags: `d` (publicId), `hash`, `currency`, `amount`, `client=satspilot`
4. Sign with `finalizeEvent` from `nostr-tools/pure`

**Never included:** customer names, phones, balances, NWC URIs, wallet secrets, or complete ledger history.

## Access model

| Surface | Auth | Shows |
| --- | --- | --- |
| `/r/[accessToken]` | Secret token (customer link / QR) | Lines, totals, live payment status, verification |
| `/verify/[publicId]` | Public | Hash, signature, attested total, backend payment state — **no line items / PII** |
| `/sales/[saleId]/receipt` | Merchant membership | Full merchant view + optional relay publish |

## Payment status

The UI shows payment status from **backend settlement records** (`Sale.paymentState` + settled `Payment` rows).

**Receipt integrity does not independently prove Lightning settlement.** A valid signature only proves the merchant attested to a specific receipt hash at issuance time.

## Public relay publication

- Default: **off**
- Merchant must explicitly opt in (`Settings → Receipt attestations`)
- Publish sends the **minimal attestation event** only
- Duplicate publish is idempotent (same event id / already-published flag)
- Merchants **never paste an nsec**; keys are generated server-side and encrypted with `WALLET_ENCRYPTION_KEY`

## Key-management limitations

- Signing keys live on the application server (encrypted at rest). This is **not** hardware-isolated custody.
- Compromising the app + encryption key compromises receipt signing.
- Rotation of signing identities is not yet automated.
- Prefer receive-only NWC for Lightning; receipt keys are a separate identity.

## Third-party verification

A third party with the Nostr event (or `/verify/...`) can check:

- NIP-01 id + schnorr signature
- That content/hash tag commit to an integrity hash
- Backend-reported payment state (via SatsPilot), which is **not** proven by the signature alone

They cannot learn customer PII or line items from the public attestation alone.
