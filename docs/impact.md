# Impact — measured vs projected

SatsPilot targets small merchants (kiosks, market stalls, neighborhood shops) who need **fast sales recording**, **optional Lightning receiving**, and **simple insights** on mid-range Android phones — with French/English support.

This document separates **what has been measured in this repository** from **future pilot projections**. No merchant testimonials or unpaid payment claims are invented here.

## Measured (this hackathon build)

| Metric | Status | Evidence |
| --- | --- | --- |
| Automated unit tests | **80 passed** (2026-11-15) | `docs/test-results.md`, `npm test` |
| E2E public/shell checks | **6 passed** | Playwright happy-path (health, headers, PWA, login shell, verify no-secret-leak) |
| Production build | Pass | `npm run build` |
| Lint / typecheck | Pass | CI workflow + local |
| Prod dependency audit | **0 vulnerabilities** (`npm audit --omit=dev`) | `docs/security-review.md` |
| Cash / credit bookkeeping | Implemented + unit-tested money math | Seed + sales/expenses modules |
| NWC receive integration | Implemented (encrypt, capabilities, invoice, lookup settle) | Code + unit settlement tests |
| Live Lightning payment | **Not measured in this environment** | Requires wallet credentials — [lightning-nwc-manual-test.md](./lightning-nwc-manual-test.md) |
| AI assistant | Implemented with Zod allowlists; works with `AI_PROVIDER=none` fallbacks | Unit tests + demo |
| Nostr receipt verify | Implemented (hash + signature verify path) | Unit tests `tests/unit/receipts.test.ts` |
| Field pilot merchants | **0** (not started) | — |
| Revenue / GMV | **Not measured** | — |

## Projected (pilot hypotheses — not results)

These are **planning targets** for a post-hackathon pilot, not claims of completed impact:

| Hypothesis | Suggested pilot metric | How to measure |
| --- | --- | --- |
| Faster end-of-day reconciliation vs paper | Time to close day (minutes) | Timed study with 5–10 shops |
| Willingness to accept Lightning for small tickets | % of tickets with Lightning option offered | App analytics (opt-in) |
| Trust in digital receipts | Customer verify page opens / week | `/verify` request counts (no PII) |
| AI useful for “how did I do today?” | Task success without inventing numbers | Moderated usability sessions |
| French usability | Task completion in FR locale | Same sessions |

## Pilot design (suggested)

1. **Cohort:** 5–10 urban kiosks (e.g. Dakar / Abidjan), Android mid-range, French primary.  
2. **Duration:** 4 weeks.  
3. **Success criteria (examples):** ≥70% of days with ≥1 digital sale recorded; ≥1 successful Lightning receive per shop that opts in (with documented NWC test); zero false “paid” states in support logs.  
4. **Ethics:** Fictitious seed data for demos; real merchant data stays private; receive-only NWC.

## What we will not claim until measured

- Merchant revenue uplift percentages  
- “X payments settled on mainnet” without the manual test record  
- Customer NPS / quotes without consent and notes  

Update this file when a pilot produces real numbers.
