# SatsPilot test results

**Date:** 2026-11-15  
**Environment:** Windows 10, Node v21.5.0, Postgres **not** listening on `:5432`  
**Commands captured under** `docs/_*-output.txt` / audit JSON

## Summary

| Suite | Result |
| --- | --- |
| Unit (`npm test`) | **80 passed** (12 files) — re-verified 2026-11-15 packaging pass |
| Typecheck (`npm run typecheck`) | **Pass** |
| Lint (`npm run lint`) | **Pass** |
| Build (`npm run build`) | **Pass** (Next.js 16.4.6 webpack; no `output: "standalone"` — incompatible with `next start`) |
| E2E (`npm run test:e2e`) | **6 passed** (1 worker, port 3010) — earlier security-review pass |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `npm audit` (full) | 15 (dev toolchain only) |
| Docker Compose / `npm run demo` | **Not verified here** (no Docker CLI in packaging environment) |

## Unit tests (actual output)

```
 RUN  v3.2.4 E:/my work/satspilot

 ✓ tests/unit/wallet-secrets.test.ts (3 tests)
 ✓ tests/unit/db-reachability.test.ts (2 tests)
 ✓ tests/unit/session-gate.test.ts (2 tests)
 ✓ tests/unit/lightning-settlement.test.ts (16 tests)
 ✓ tests/unit/settlement-concurrency.test.ts (5 tests)
 ✓ tests/unit/bookkeeping-math.test.ts (10 tests)
 ✓ tests/unit/validation.test.ts (5 tests)
 ✓ tests/unit/bookkeeping-validation.test.ts (5 tests)
 ✓ tests/unit/authz.test.ts (3 tests)
 ✓ tests/unit/receipts.test.ts (8 tests)
 ✓ tests/unit/assistant-ai.test.ts (20 tests)
 ✓ tests/unit/health.test.ts (1 test)

 Test Files  12 passed (12)
      Tests  80 passed (80)
```

Coverage of review requirements:

- Repeated invoice lookup / never treat pending as paid — `lightning-settlement`, `settlement-concurrency`
- Concurrent settlement coalescing / monotonic paid — `settlement-concurrency`
- AI refuse pay/secrets + schema allowlists — `assistant-ai`
- Wallet secret encrypt/redact — `wallet-secrets`
- DB down preflight — `db-reachability`

## E2E happy path (actual output)

Playwright uses `next start -H 127.0.0.1:3010` after production build; device profile Pixel 5.

```
Running 6 tests using 1 worker

  ok 1 › health endpoint is ok and uncached secrets
  ok 2 › security headers present on HTML
  ok 3 › manifest is installable metadata
  ok 4 › offline shell HTML is available
  ok 5 › login page HTML includes sign-in controls
  ok 6 › missing receipt verify API does not leak secrets

  6 passed (8.6s)
```

Notes:

- Authenticated Lightning create→settle UI path was **not** run (requires Postgres + NWC).
- Verify API with DB down returns controlled error / no secret leak (previously crashed the server; fixed via TCP preflight).

## Dependency audit (actual)

```
npm audit --omit=dev
found 0 vulnerabilities
```

Full audit (dev): critical/high attributed to `vitest` / `@vitest/coverage-v8` / `vite` (test & lint toolchain). Overrides in force: `tinypool@2.2.0`, `deepmerge-ts@8.0.1`.

## Unresolved test gaps

1. Live NWC `make_invoice` / `lookup_invoice` settlement against a real wallet.
2. Multi-instance concurrent settle under real Postgres (unit tests simulate claim/idempotency semantics).
3. Full browser login → dashboard → receive flow (needs DB seed).

See [security-review.md](./security-review.md) for residual product risks.
