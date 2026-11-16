-- Bookkeeping extensions: stock, sale payment state, payment kinds, expense dates

CREATE TYPE "SalePaymentState" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');

CREATE TYPE "PaymentKind" AS ENUM ('SALE_PAYMENT', 'CUSTOMER_REPAYMENT', 'REFUND');

ALTER TABLE "products"
ADD COLUMN "track_stock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stock_on_hand" INTEGER;

ALTER TABLE "sales"
ADD COLUMN "payment_state" "SalePaymentState" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN "amount_paid_minor" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "sales_merchant_id_payment_state_idx" ON "sales"("merchant_id", "payment_state");

ALTER TABLE "payments"
ADD COLUMN "kind" "PaymentKind" NOT NULL DEFAULT 'SALE_PAYMENT';

CREATE INDEX "payments_merchant_id_kind_idx" ON "payments"("merchant_id", "kind");

ALTER TABLE "expenses"
ADD COLUMN "occurred_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "expenses_idempotency_key_key" ON "expenses"("idempotency_key");

CREATE INDEX "expenses_merchant_id_occurred_on_idx" ON "expenses"("merchant_id", "occurred_on");
