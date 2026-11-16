# Manual two-wallet Lightning receive test (NWC / NIP-47)

This checklist verifies **real** Lightning receiving in SatsPilot. Use **two separate wallets**:

| Role | Wallet | Purpose |
| --- | --- | --- |
| Merchant | Wallet A (e.g. Alby Hub / Alby extension NWC app) | Create a **receive-only** NWC connection |
| Payer | Wallet B (e.g. Phoenix, Muun, Zeus, or a second Alby account) | Pay the BOLT11 invoice |

Do **not** use the same connection that can spend merchant funds for day-to-day testing if a receive-only option exists.

## Prerequisites

1. Postgres running; migrations applied (`npx prisma migrate deploy`).
2. `.env.local` has:
   - `AUTH_SECRET`
   - `WALLET_ENCRYPTION_KEY` (32-byte hex/base64 — **separate** from `AUTH_SECRET`)
   - `DATABASE_URL`
   - `LIGHTNING_PROVIDER` unset or `nwc` (not `mock`) for a live test
3. Merchant account logged in.
4. Tiny test amount only (e.g. **1–21 sats** on a test/demo wallet balance).

## Create a receive-only NWC connection (Wallet A)

1. In your NWC provider UI, create a new app connection for SatsPilot.
2. If permissions are offered, enable **only**:
   - `make_invoice`
   - `lookup_invoice`
   - (optional) `get_info`
3. Do **not** enable `pay_invoice` / `multi_pay_invoice` for this connection.
4. Copy the `nostr+walletconnect://…` URI. Treat it as a secret.

## Connect in SatsPilot

1. Open **Settings → Lightning wallet (NWC)**.
2. Paste the URI into the password field (it is sent once to the authenticated backend).
3. Submit **Connect wallet**.
4. Confirm:
   - Status shows **Connected**
   - Capabilities list includes `make_invoice` and `lookup_invoice`
   - Prefer the green receive-only message (no `pay_invoice`)
5. Confirm the URI field is cleared and that refreshing Settings does **not** show the URI again (network tab / API `GET …/wallet` must not contain `nwc`, `secret`, or ciphertext).

## Receive payment

1. Open **Payments → Receive Lightning**.
2. Enter a tiny amount in **sats** (exact integer).
3. Create the invoice.
4. Confirm UI shows:
   - QR code
   - Copyable BOLT11 string
   - Status **pending**
5. Optionally reload the page with the same `paymentId` query param — invoice should resume (recovery).

## Pay from Wallet B

1. Scan the QR **or** paste BOLT11 into Wallet B.
2. Confirm amount matches exactly.
3. Send the payment.
4. Watch SatsPilot poll (status moves to **settled** only after server `lookup_invoice`).
5. Confirm:
   - Payment row appears under Payments as Lightning / settled
   - Associated SAT sale is marked paid
   - Browser DevTools: no request body/response contains NWC secrets
   - Sending `{ "paid": true }` to the poll API does **not** settle anything by itself

## Negative checks

| Case | Expected |
| --- | --- |
| Wait until expiry without paying | Status → expired; sale stays unpaid |
| Disconnect wallet mid-pending | Further polls fail with wallet required |
| Another user / merchant ID | 403 / unauthorized |
| `LIGHTNING_PROVIDER=mock` | Banner says demo; not a live payment |

## Record result

- **Live payment verified:** yes / no
- **Date:**
- **Amount (sats):**
- **Payment hash (safe to record):**
- **Wallets used:**

If no NWC credentials were available, mark the integration **untested for live payment** — do not claim success.
