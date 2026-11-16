-- Privacy-preserving signed receipts + server-managed merchant signing identities

ALTER TABLE "merchants"
ADD COLUMN IF NOT EXISTS "nostr_publish_opt_in" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "merchant_signing_identities" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "pubkey_hex" TEXT NOT NULL,
    "encrypted_secret" TEXT NOT NULL,
    "encryption_iv" TEXT NOT NULL,
    "encryption_tag" TEXT NOT NULL,
    "encryption_key_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_signing_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "merchant_signing_identities_merchant_id_key"
ON "merchant_signing_identities"("merchant_id");

ALTER TABLE "merchant_signing_identities"
DROP CONSTRAINT IF EXISTS "merchant_signing_identities_merchant_id_fkey";

ALTER TABLE "merchant_signing_identities"
ADD CONSTRAINT "merchant_signing_identities_merchant_id_fkey"
FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "receipts" (
    "id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "canonical_json" TEXT NOT NULL,
    "integrity_hash" TEXT NOT NULL,
    "pubkey_hex" TEXT NOT NULL,
    "signed_event_json" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "total_minor" INTEGER NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "published_to_relay" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "published_relay" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "receipts_public_id_key" ON "receipts"("public_id");
CREATE UNIQUE INDEX IF NOT EXISTS "receipts_access_token_key" ON "receipts"("access_token");
CREATE UNIQUE INDEX IF NOT EXISTS "receipts_sale_id_key" ON "receipts"("sale_id");
CREATE INDEX IF NOT EXISTS "receipts_merchant_id_created_at_idx" ON "receipts"("merchant_id", "created_at");
CREATE INDEX IF NOT EXISTS "receipts_event_id_idx" ON "receipts"("event_id");

ALTER TABLE "receipts"
DROP CONSTRAINT IF EXISTS "receipts_merchant_id_fkey";

ALTER TABLE "receipts"
ADD CONSTRAINT "receipts_merchant_id_fkey"
FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "receipts"
DROP CONSTRAINT IF EXISTS "receipts_sale_id_fkey";

ALTER TABLE "receipts"
ADD CONSTRAINT "receipts_sale_id_fkey"
FOREIGN KEY ("sale_id") REFERENCES "sales"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
