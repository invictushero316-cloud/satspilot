import { PaymentsView } from "@/components/screens/payments-view";
import { mapPayment } from "@/server/data/mappers";
import { requireMerchantPageContext } from "@/server/merchant-context";
import { prisma } from "@/server/db/prisma";
import { requireMerchantMembership } from "@/server/authz/merchant";
import { getPublicWalletStatus } from "@/server/services/wallet";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ merchantId?: string }>;
}) {
  const params = await searchParams;
  const { userId, merchants, merchant } = await requireMerchantPageContext(
    params.merchantId,
  );
  await requireMerchantMembership(userId, merchant.id);

  const [payments, wallet] = await Promise.all([
    prisma.payment.findMany({
      where: {
        merchantId: merchant.id,
        OR: [
          { method: "CASH", status: "SETTLED" },
          { method: "LIGHTNING" },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getPublicWalletStatus(userId, merchant.id),
  ]);

  return (
    <PaymentsView
      merchants={merchants}
      activeMerchantId={merchant.id}
      payments={payments.map(mapPayment)}
      walletConnected={wallet.connected}
    />
  );
}
