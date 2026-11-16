import { ReceiveLightningView } from "@/components/lightning/receive-lightning-view";
import { ServiceOutageBanner } from "@/components/system/service-outage-banner";
import { TransactionStatusNote } from "@/components/system/transaction-status-note";
import { reconcilePendingLightningPayments } from "@/server/lightning/reconcile";
import { requireMerchantPageContext } from "@/server/merchant-context";
import { getLightningPaymentForResume } from "@/server/services/lightning";
import { getPublicWalletStatus } from "@/server/services/wallet";

export default async function ReceiveLightningPage({
  searchParams,
}: {
  searchParams: Promise<{ merchantId?: string; paymentId?: string }>;
}) {
  const params = await searchParams;
  const { userId, merchants, merchant } = await requireMerchantPageContext(
    params.merchantId,
  );
  const wallet = await getPublicWalletStatus(userId, merchant.id);
  const demoMode = process.env.LIGHTNING_PROVIDER?.toLowerCase() === "mock";

  // Survive restarts: re-check persisted pending invoices via lookup_invoice.
  if (wallet.connected) {
    try {
      await reconcilePendingLightningPayments({
        userId,
        merchantId: merchant.id,
        limit: 10,
      });
    } catch {
      // Non-fatal — UI still loads; individual poll handles errors.
    }
  }

  let initialInvoice = null;
  if (params.paymentId) {
    try {
      initialInvoice = await getLightningPaymentForResume(
        userId,
        merchant.id,
        params.paymentId,
      );
    } catch {
      initialInvoice = null;
    }
  }

  return (
    <>
      <div className="mx-auto max-w-lg space-y-2 px-3 pt-3">
        {!wallet.connected ? <ServiceOutageBanner kind="wallet" /> : null}
        {initialInvoice?.status === "pending" ? (
          <TransactionStatusNote kind="pending_payment" />
        ) : null}
        {initialInvoice?.status === "settled" ? (
          <TransactionStatusNote kind="confirmed" />
        ) : null}
      </div>
      <ReceiveLightningView
        merchants={merchants}
        activeMerchantId={merchant.id}
        walletConnected={wallet.connected}
        initialInvoice={initialInvoice}
        demoMode={demoMode}
      />
    </>
  );
}
