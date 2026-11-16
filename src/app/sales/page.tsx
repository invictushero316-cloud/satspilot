import { SalesHistoryView } from "@/components/screens/sales-history-view";
import { mapSale } from "@/server/data/mappers";
import { requireMerchantPageContext } from "@/server/merchant-context";
import { listSales } from "@/server/services/sales";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    merchantId?: string;
    from?: string;
    to?: string;
    paymentState?: string;
  }>;
}) {
  const params = await searchParams;
  const { userId, merchants, merchant } = await requireMerchantPageContext(
    params.merchantId,
  );
  const sales = await listSales(userId, {
    merchantId: merchant.id,
    from: params.from,
    to: params.to,
    paymentState: params.paymentState,
  });

  return (
    <SalesHistoryView
      merchants={merchants}
      activeMerchantId={merchant.id}
      sales={sales.map(mapSale)}
      filters={{
        from: params.from,
        to: params.to,
        paymentState: params.paymentState,
      }}
    />
  );
}
