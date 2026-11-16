# SatsPilot threat model

**Scope:** Hackathon MVP — Next.js App Router merchant console with Auth.js, Postgres/Prisma, NWC Lightning receive, AI assistant, and signed receipts.  
**Date:** 2026-11-15

## Assets

| Asset | Sensitivity | Notes |
| --- | --- | --- |
| NWC connection URI / wallet permissions | Critical | Encrypted at rest; never returned after connect |
| `WALLET_ENCRYPTION_KEY` | Critical | Env-only; also wraps receipt signing secrets |
| Merchant Nostr signing secret | Critical | Server-generated; AES-GCM; never pasted as nsec |
| Auth session JWT / `AUTH_SECRET` | High | Cookie session |
| Sale/payment ledger, customer PII | High | Merchant-scoped |
| Receipt access tokens | High | Bearer capability for customer receipt |
| AI API key | High | Server-only |
| Demo seed password | Low (dev) | Documented for local demo only |

## Trust boundaries

1. **Browser ↔ Next.js** — untrusted input; cookies + Server Actions / JSON APIs  
2. **App ↔ Postgres** — trusted after authz checks  
3. **App ↔ NWC wallet provider** — external; responses must be validated (hash, amount, direction, state)  
4. **App ↔ AI provider** — untrusted output; Zod + allowlists; no mutation tools  
5. **App ↔ Nostr relay** — optional; minimal attestation events only after opt-in  
6. **Customer receipt link** — secret token capability; no login  

## Attack scenarios & mitigations

| Attack | Mitigation | Residual risk |
| --- | --- | --- |
| Steal NWC URI from API/logs | Redaction DTOs; no URI in responses; audit metadata excludes secrets; `console.error` message-only | Compromised server + encryption key still exposes ciphertext decryption |
| Cross-merchant data access | `requireMerchantMembership` on every merchant-scoped read/write | Bugs in a new route that skips the helper |
| Fake “paid” from browser | Settlement only after `lookup_invoice` + `verifyIncomingSettlement` | Wallet provider compromise / lying node |
| Double settlement race | `updateMany` claim PENDING/UNKNOWN→SETTLED; idempotent lookups | Multi-instance race without DB serializable still mitigated by claim |
| Prompt injection → spend | Forbidden patterns; no `pay_invoice`; confirm-only sale mutations | Model may still produce misleading text (not funds movement) |
| Brute-force receipt tokens | 24-byte random token; rate limits on `/api/receipts` & `/api/verify` | Shared IP NAT may throttle legit users |
| CSRF on cookie APIs | Auth.js SameSite cookies; Server Actions Origin checks | Custom JSON POST APIs remain cookie-auth; prefer SameSite=Lax + no cross-site embeds (`X-Frame-Options: DENY`) |
| XSS → session theft | React encoding; CSP baseline; no `dangerouslySetInnerHTML` in app code | `'unsafe-inline'` scripts/styles weaken CSP (Next.js constraint) |
| Dependency CVE | `npm audit` tracked in security-review | Transitive vulns may remain until upstream fixes |
| Publish PII to Nostr | Opt-in flag; content = hash only; publish guardrails | Misconfigured future event builder |

## Security controls checklist

- [x] AES-256-GCM wallet/signing secret storage with separate key from `AUTH_SECRET`  
- [x] NWC capability gate (`make_invoice` + `lookup_invoice`); warn on `pay_invoice`  
- [x] Rate limits: wallet connect, invoices, polls, AI chat, receipt public APIs, reconcile  
- [x] Security headers: CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`  
- [x] Private APIs `Cache-Control: no-store`  
- [x] AI cannot mutate ledger without explicit confirm action  

## Out of scope / residual

- Hardware HSM for signing keys  
- Full CSP without `'unsafe-inline'` / `'unsafe-eval'` (Next.js App Router constraint)  
- WAF / per-IP global rate limit across instances (in-memory limits are per process)  
- Production OAuth / MFA  
- Formal pen-test  
- **Windows Prisma engine crash:** If the query engine is invoked while Postgres is unreachable, some Windows hosts ACCESS_VIOLATION the Node process. Mitigated by TCP preflight (`ensureDatabaseReachable`) before every Prisma operation; residual if preflight falsely reports the port open while the engine still panics.  
- **Dev-only npm audit (vitest/vite):** Production `npm audit --omit=dev` is clean; test-tooling advisories remain until Vitest major upgrade. Do not expose `vitest --ui` on untrusted networks.  

