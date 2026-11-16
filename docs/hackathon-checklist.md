# Hackathon submission checklist

Use this before freezing the Devpost / GitHub entry.

## Deliverables

- [x] Professional README (problem, merchant, solution, features, screenshots, architecture, stack, setup, limitations, roadmap)
- [x] Docker Compose (Postgres + app) + `Dockerfile`
- [x] One-command demo (`npm run demo`)
- [x] Fictitious seed + documented demo user
- [x] `docs/demo-script.md` (3-minute)
- [x] `docs/impact.md` (measured vs projected)
- [x] `docs/security-review.md`
- [x] `docs/architecture.md`
- [x] `docs/deployment.md`
- [x] `docs/submission.md` (Devpost pitch)
- [x] `LICENSE` (MIT)
- [x] GitHub Actions CI (lint, typecheck, test, build)

## Verified in this packaging pass (2026-11-15)

| Item | Result |
| --- | --- |
| `npm run typecheck` | **Pass** |
| `npm run lint` | **Pass** |
| `npm test` | **80 passed** |
| `npm run build` | **Pass** |
| Seed / migrate against live Postgres | **Not run** — Docker CLI unavailable; Postgres `:5432` not listening in this environment |
| `npm run demo` / Compose smoke | **Not run** — no `docker` on PATH |
| Cash sale (UI) | Implemented + seeded fixtures; UI not re-clicked in this pass |
| Wallet integration | Code path ready; Compose defaults `LIGHTNING_PROVIDER=mock` |
| Invoice + settlement | Unit tests cover verify/idempotency; **live NWC unpaid** |
| AI assistant | Unit tests pass; `AI_PROVIDER=none` fallbacks supported |
| Nostr receipt signature verify | **8 receipt unit tests passed** |
| Invented testimonials / live-pay claims | **None** — see `docs/impact.md` |

## Outstanding (do not hide)

- [ ] **Live NWC two-wallet settlement** — complete [lightning-nwc-manual-test.md](./lightning-nwc-manual-test.md) and only then claim a live payment  
- [ ] Docker Compose smoke on a machine with Docker (`npm run demo`)  
- [ ] `prisma migrate deploy` + `npm run db:seed` against a running Postgres  
- [ ] Push to public GitHub + link from Devpost  
- [ ] Optional: replace illustrative screenshots with real device captures  

## Pitch package

1. Devpost description ← `docs/submission.md`  
2. Demo video ← follow `docs/demo-script.md`  
3. Repo link ← this project  
4. Built with ← Next.js, Postgres, NWC, Nostr, AI  
