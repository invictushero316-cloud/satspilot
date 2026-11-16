# One-command hackathon / local demo (Windows): Postgres + migrate + seed + app
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker is required for npm run demo. Install Docker Desktop, then retry."
  Write-Host "Fallback without Docker:"
  Write-Host "  1. Run PostgreSQL 16 locally"
  Write-Host "  2. copy .env.example .env.local  (fill AUTH_SECRET + WALLET_ENCRYPTION_KEY)"
  Write-Host "  3. npm install; npx prisma migrate deploy; npm run db:seed; npm run dev"
  exit 1
}

if (-not (Test-Path .env.local) -and -not (Test-Path .env)) {
  Write-Host "Creating .env.local from .env.example (dev secrets — replace before any public deploy)."
  Copy-Item .env.example .env.local
  $auth = node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  $wallet = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  (Get-Content .env.local) `
    -replace '^AUTH_SECRET=.*', "AUTH_SECRET=$auth" `
    -replace '^WALLET_ENCRYPTION_KEY=.*', "WALLET_ENCRYPTION_KEY=$wallet" |
    Set-Content .env.local
  Add-Content .env.local "LIGHTNING_PROVIDER=mock"
  Add-Content .env.local "ALLOW_DEMO_SEED=true"
  Add-Content .env.local "APP_ENV=demo"
}

Write-Host "Starting SatsPilot (docker compose up --build)…"
docker compose up --build -d

Write-Host ""
Write-Host "SatsPilot is starting. When healthy:"
Write-Host "  URL:   http://localhost:3000"
Write-Host "  Email: merchant.demo@satspilot.local"
Write-Host "  Pass:  DemoMerchant1!"
Write-Host ""
Write-Host "Lightning: LIGHTNING_PROVIDER=mock (labeled demo). Live NWC: docs/lightning-nwc-manual-test.md"
Write-Host "Demo script: docs/demo-script.md"
Write-Host "Logs: docker compose logs -f app"
