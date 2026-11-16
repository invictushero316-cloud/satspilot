# SatsPilot security review

**Date:** 2026-11-15  
**Scope:** Full app — Auth.js, NWC receive, AI assistant, Nostr receipts, PWA, APIs, deps, secrets hygiene.  
**Companion docs:** [threat-model.md](./threat-model.md), [test-results.md](./test-results.md)

## Verdict

Critical and high **runtime** issues found during this review were fixed. Production dependency audit is clean (`npm audit --omit=dev` → **0 vulnerabilities**). Live Lightning settlement was **not** exercised (no NWC credentials in this environment). Remaining risks are documented under Residual.

## Findings fixed in this pass

| Severity | Finding | Fix |
| --- | --- | --- |
| Critical | Prisma query engine on Windows can **kill the Node process** (ACCESS_VIOLATION) when Postgres is unreachable; `/api/verify` ECONNRESET took down `next start` | TCP preflight `ensureDatabaseReachable` via Prisma `$extends` before every query; `withDatabase` maps remaining DB errors to `503` |
| High | Service worker precached `/` (could cache session-specific HTML) | Precache limited to `/offline`, manifest, icon; `/api`, `/r/`, `/verify/` never cached |
| High | Some merchant APIs lacked route-level rate limits / inconsistent error handling | Rate limits on products, wallet GET/DELETE, payment resume/poll, assistant route; products uses `jsonFromError` |
| Medium | Process could die on unhandled Prisma rejections | `src/instrumentation.ts` last-resort handler for DB unhandledRejections |

## Audit matrix

### NWC secret handling

| Control | Status |
| --- | --- |
| AES-256-GCM at rest (`WALLET_ENCRYPTION_KEY`, 32-byte hex/base64) | Pass |
| URI accepted only on connect; never returned in API DTOs | Pass (`toPublicWalletConnection` / `redactSecrets`) |
| Capability gate: requires `make_invoice` + `lookup_invoice`; warns on `pay_invoice` | Pass |
| App never calls `pay_invoice` | Pass (provider surface: getInfo / makeInvoice / lookupInvoice only) |
| Logs avoid ciphertext / URI | Pass (API errors log message-only) |

### Authorization & sensitive routes

| Route | Auth | Merchant scope | Rate limit |
| --- | --- | --- | --- |
| `POST …/lightning/invoices` | Session | `requireMerchantMembership` | Yes |
| `GET/POST …/lightning/payments/[id]` | Session | Membership + payment.merchantId | Yes (service + route) |
| `GET/POST/DELETE …/wallet` | Session | Membership | Yes |
| `POST …/assistant/chat` | Session | Membership | Yes (route + service) |
| `GET …/products` | Session | Membership | Yes |
| `GET /api/receipts/[token]` | Capability token | N/A | Yes |
| `GET /api/verify/[publicId]` | Public | Minimal public payload | Yes |
| `GET /api/health` | Public | No secrets | N/A |
| `…/api/auth/*` | Auth.js | — | Auth.js defaults |

### CSRF / session / headers / validation

- Auth.js JWT session, `trustHost: true`, public path allowlist in `authorized` callback.
- SameSite cookie session + `X-Frame-Options: DENY` + `frame-ancestors 'none'` reduce CSRF/clickjacking.
- Security headers: CSP (with Next-required `'unsafe-inline'`/`'unsafe-eval'`), `nosniff`, Referrer-Policy, Permissions-Policy.
- `/api/*` → `Cache-Control: no-store`; hashed `/_next/static` long-cache only.
- Zod validation on wallet connect, invoices, AI chat; React default output encoding (no `dangerouslySetInnerHTML` in app source).

### AI cannot send payments or unapproved mutations

- System prompt + forbidden regex refuse `pay_invoice` / secret exfil / permission changes.
- Structured output Zod-validated; sale drafts require separate merchant confirm action.
- Chat route strips client `execute`/`confirm`/`pay` fields — only `message` + `locale` forwarded.

### Payment success semantics

- Settlement only after `lookup_invoice` + `verifyIncomingSettlement` (hash, amount, incoming, settled).
- Concurrent settle uses claim `updateMany` PENDING/UNKNOWN → SETTLED.
- Restart reconciliation: `reconcilePendingLightningPayments` on receive page load.
- UI: `TransactionStatusNote` distinguishes draft / pending / confirmed; offline shell states unconfirmed payments are never shown as paid.

### Secrets in Git

- Workspace is **not** a git repository in this environment (`NO_GIT_REPO`).
- `.env` / `.env.local` present locally; `.gitignore` covers `.env*`.
- Secret scan of source: only documentation/placeholders for `nostr+walletconnect://` scheme — no live NWC URIs, nsecs, or cloud keys.

### Dependencies

| Command | Result |
| --- | --- |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `npm audit` (incl. dev) | 15 issues (12 moderate, 1 high, 2 critical) — all in **vitest/vite/eslint** toolchain |
| Overrides | `tinypool@2.2.0`, `deepmerge-ts@8.0.1` applied |

## Accessibility / mobile / PWA / i18n (review notes)

- Viewport meta + `Pixel 5` e2e device; primary controls `h-11` (~44px); skip link; nav `aria-label`s; dialogs labelled.
- EN + FR dictionaries include reliability / wallet / assistant / receipts strings.
- PWA: `manifest.webmanifest`, icons, SW caches **static-only**; offline page.
- Service outage banners for wallet/AI; bookkeeping continues for cash drafts.

## Residual risks (unresolved — stop here)

1. **CSP** still allows `'unsafe-inline'` and `'unsafe-eval'` (Next.js App Router). XSS impact remains higher than a strict CSP.
2. **In-process rate limits** do not sync across multiple Node instances.
3. **No HSM** — `WALLET_ENCRYPTION_KEY` + signing secrets are software keys; server compromise decrypts NWC URIs and Nostr secrets.
4. **Wallet provider trust** — a lying NWC node can claim settlement; app verifies fields but cannot prove chain truth beyond the provider.
5. **Windows Prisma residual** — TCP preflight avoids the known ACCESS_VIOLATION path; edge cases (port open, engine still panics) remain.
6. **DevDependency advisories** — vitest UI / vite launch-editor / esbuild (dev server). Do not run Vitest UI or Vite dev servers on untrusted networks; production runtime unaffected.
7. **Live NWC / Lightning** not end-to-end tested in this review (credentials absent).
8. **Postgres required** for authenticated merchant flows; without it, public/static/health/offline/PWA paths work, ledger APIs return `503`.

## Recommendation

Treat as hackathon-ready with receive-only NWC, confirmed settlement, and documented residuals. Before production: rotate keys, enable managed Postgres HA, tighten CSP where Next allows, replace in-memory rate limits with Redis/edge, and run a live NWC settlement drill.
