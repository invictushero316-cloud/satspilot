#!/usr/bin/env bash
# One-command hackathon / local demo: Postgres + migrate + seed + app
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for npm run demo. Install Docker Desktop, then retry."
  echo "Fallback: start Postgres yourself, copy .env.example → .env.local, then:"
  echo "  npm install && npx prisma migrate deploy && npm run db:seed && npm run dev"
  exit 1
fi

if [ ! -f .env.local ] && [ ! -f .env ]; then
  echo "Creating .env.local from .env.example (dev secrets — replace before any public deploy)."
  cp .env.example .env.local
  AUTH_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
  WALLET_KEY="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  # Portable-ish in-place edit for common sed
  if [[ "$OSTYPE" == darwin* ]]; then
    sed -i '' "s|^AUTH_SECRET=.*|AUTH_SECRET=${AUTH_SECRET}|" .env.local
    sed -i '' "s|^WALLET_ENCRYPTION_KEY=.*|WALLET_ENCRYPTION_KEY=${WALLET_KEY}|" .env.local
  else
    sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=${AUTH_SECRET}|" .env.local
    sed -i "s|^WALLET_ENCRYPTION_KEY=.*|WALLET_ENCRYPTION_KEY=${WALLET_KEY}|" .env.local
  fi
  echo "LIGHTNING_PROVIDER=mock" >> .env.local
  echo "ALLOW_DEMO_SEED=true" >> .env.local
  echo "APP_ENV=demo" >> .env.local
fi

echo "Starting SatsPilot (docker compose up --build)…"
docker compose up --build -d

echo ""
echo "SatsPilot is starting. When healthy:"
echo "  URL:   http://localhost:3000"
echo "  Email: merchant.demo@satspilot.local"
echo "  Pass:  DemoMerchant1!"
echo ""
echo "Lightning: LIGHTNING_PROVIDER=mock (labeled demo). Live NWC: see docs/lightning-nwc-manual-test.md"
echo "Demo script: docs/demo-script.md"
echo "Logs: docker compose logs -f app"
