# 3-minute demo script (hackathon)

**Target length:** ~3:00  
**Setup:** `npm run demo` → http://localhost:3000  
**Login:** `merchant.demo@satspilot.local` / `DemoMerchant1!`

> Compose defaults use `LIGHTNING_PROVIDER=mock` so invoice → settlement is reproducible **without** real wallet credentials. The UI labels this as demo mode.  
> **Live mainnet / testnet NWC settlement is an outstanding manual test** — follow [lightning-nwc-manual-test.md](./lightning-nwc-manual-test.md). Do not claim a live payment unless you completed that checklist.

---

### 0:00–0:25 — Problem

> “Small shops in West Africa run on cash, notebooks, and trust. Lightning phones exist, but merchants still lack a simple, secure way to record sales, accept sats, and understand their week — in French or English, on a mid-range Android.”

Show the login → dashboard (seeded “Marché Keur Demo”).

### 0:25–0:55 — Record a cash sale

1. **New sale** → add bottled water × 2 (or bread).  
2. Pay **Cash** → confirm.  
3. Point out: integer XOF amounts, sale appears in history, **not** mixed with sats FX.

### 0:55–1:25 — Connect wallet

1. **Settings → Lightning wallet**.  
2. For mock demo: connect with URI `mock://satspilot-demo-receive-only` (or rely on `LIGHTNING_PROVIDER=mock` already set by Compose).  
3. Say: “NWC URI is encrypted at rest and never returned to the browser. We prefer receive-only: `make_invoice` + `lookup_invoice` — we never call `pay_invoice`.”

### 1:25–1:55 — Lightning invoice + settlement

1. **Payments → Receive Lightning**.  
2. Create a tiny invoice (e.g. 21 sats). Show QR + BOLT11 + **pending**.  
3. Wait for poll / tap refresh — status becomes **settled** only after server `lookup_invoice` verification.  
4. Emphasize: “The browser cannot mark this paid. Client `paid: true` is ignored.”

If using **live NWC** instead of mock: pay from a second wallet per the manual test doc; only then say “live settlement verified.”

### 1:55–2:20 — Signed receipt

1. Open the sale → **Receipt**.  
2. Show customer QR / link (`/r/…`) and public verify (`/verify/…`).  
3. Say: “Canonical hash + Nostr signature. Public verify shows attestation + payment state — no customer PII. Relay publish is opt-in.”

### 2:20–2:45 — AI ledger insights

1. Open **Assistant**.  
2. Ask: “How were today’s sales?” / « Quelles sont les ventes d’aujourd’hui ? »  
3. Show ledger-backed answer (or safe fallback if `AI_PROVIDER=none`).  
4. Optional: “Sold 2 bread for cash” → suggestion card → **Confirm** required.  
5. Say: “AI never sends Bitcoin or writes the ledger without the merchant.”

### 2:45–3:00 — Impact & future

> “SatsPilot is open source (MIT): bookkeeping + Lightning receive + privacy-preserving receipts + a guarded AI. Next: pilot with real shops, receive-only NWC at scale, and metrics in docs/impact.md — we separate measured results from projections.”

Stop. Offer judges the README + security-review + manual Lightning checklist.
