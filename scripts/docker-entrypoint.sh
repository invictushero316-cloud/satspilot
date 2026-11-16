#!/bin/sh
set -eu

echo "[satspilot] Applying Prisma migrations…"
npx prisma migrate deploy

if [ "${RUN_DEMO_SEED:-false}" = "true" ]; then
  echo "[satspilot] Seeding fictitious demo data…"
  export ALLOW_DEMO_SEED=true
  export APP_ENV="${APP_ENV:-demo}"
  npm run db:seed
fi

echo "[satspilot] Starting Next.js on :${PORT:-3000}"
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
