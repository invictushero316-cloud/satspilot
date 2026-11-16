import { SettingsView } from "@/components/screens/settings-view";
import { requireMerchantPageContext } from "@/server/merchant-context";
import { getPublicWalletStatus } from "@/server/services/wallet";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ merchantId?: string }>;
}) {
  const params = await searchParams;
  const { userId, merchants, merchant } = await requireMerchantPageContext(
    params.merchantId,
  );

  const wallet = await getPublicWalletStatus(userId, merchant.id);
  const demoMode =
    process.env.LIGHTNING_PROVIDER?.toLowerCase() === "mock" ||
    process.env.APP_ENV === "demo";

  return (
    <SettingsView
      merchants={merchants}
      merchant={merchant}
      walletStatus={{
        connected: wallet.connected,
        label: wallet.label ?? wallet.connection?.label ?? null,
        capabilities: wallet.capabilities,
        includesPayInvoice: wallet.includesPayInvoice,
        network: wallet.network ?? null,
        lud16: wallet.lud16 ?? null,
        receiveOnlyRecommended: wallet.receiveOnlyRecommended,
        demoMode,
      }}
    />
  );
}
