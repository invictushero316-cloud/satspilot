# Deployment

## Local demo (recommended for judges)

```bash
git clone <repo-url> satspilot
cd satspilot
npm run demo          # Docker Compose: Postgres + migrate + seed + app
# open http://localhost:3000
```

Demo credentials (fictitious):

| Field | Value |
| --- | --- |
| Email | `merchant.demo@satspilot.local` |
| Password | `DemoMerchant1!` |

Stop: `npm run demo:down` or `docker compose down`.

### Without Docker

1. PostgreSQL 16 with a database matching `DATABASE_URL`.
2. `cp .env.example .env.local` and set `AUTH_SECRET`, `WALLET_ENCRYPTION_KEY`.
3. `npm install`
4. `npx prisma migrate deploy && npm run db:seed`
5. `npm run dev` (or `npm run build && npm start`)

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string |
| `AUTH_SECRET` | Yes | Auth.js secret (`openssl rand -base64 32`) |
| `WALLET_ENCRYPTION_KEY` | Yes | 32-byte hex or base64 — **separate** from `AUTH_SECRET` |
| `AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Yes in prod | Public origin |
| `LIGHTNING_PROVIDER` | No | `nwc` (default) or `mock` (labeled demo only) |
| `AI_PROVIDER` / `AI_API_KEY` | No | `none` / `mock` / `openai` / `compatible` |
| `NOSTR_RECEIPT_RELAY_URL` | No | Used only if merchant opts into relay publish |
| `ALLOW_DEMO_SEED` / `APP_ENV=demo` | Demo only | Required to seed outside development |

Never commit `.env` / `.env.local`. Compose demo defaults are **dev-only** secrets.

## Production checklist

1. Generate unique `AUTH_SECRET` and `WALLET_ENCRYPTION_KEY`.
2. Use managed Postgres (TLS); do not expose Postgres publicly.
3. Set `NODE_ENV=production`, `APP_ENV=production`, `ALLOW_DEMO_SEED` unset.
4. Set `LIGHTNING_PROVIDER=nwc` and connect a **receive-only** NWC app in Settings.
5. Terminate TLS at a reverse proxy; set correct `AUTH_URL`.
6. Prefer `docker compose up --build` with secrets via env files / secret store — replace compose default secrets.
7. Do not run `db:seed` in production.

## Health

`GET /api/health` — liveness without secrets (`Cache-Control: no-store`).

## Related docs

- [architecture.md](./architecture.md)
- [security-review.md](./security-review.md)
- [lightning-nwc-manual-test.md](./lightning-nwc-manual-test.md)
- [demo-script.md](./demo-script.md)
