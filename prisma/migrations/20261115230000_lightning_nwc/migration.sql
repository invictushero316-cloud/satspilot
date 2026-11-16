-- Lightning receive (NWC) fields

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'UNKNOWN';

ALTER TABLE "payments"
ADD COLUMN IF NOT EXISTS "expected_amount_msats" BIGINT,
ADD COLUMN IF NOT EXISTS "bolt11" TEXT,
ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "last_lookup_at" TIMESTAMP(3);

ALTER TABLE "wallet_connections"
ADD COLUMN IF NOT EXISTS "capabilities" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "network" TEXT,
ADD COLUMN IF NOT EXISTS "lud16" TEXT,
ADD COLUMN IF NOT EXISTS "includes_pay_invoice" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "wallet_connections_merchant_id_key" ON "wallet_connections"("merchant_id");
