import { DashboardView } from "@/components/screens/dashboard-view";
import { mapAnalytics, mapPayment, mapSale } from "@/server/data/mappers";
import { getDashboardSnapshot } from "@/server/services/analytics";
import { requireMerchantPageContext } from "@/server/merchant-context";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ merchantId?: string }>;
}) {
  const params = await searchParams;
  const { userId, merchants, merchant } = await requireMerchantPageContext(
    params.merchantId,
  );
  const snapshot = await getDashboardSnapshot(userId, merchant.id);

  return (
    <DashboardView
      merchants={merchants}
      activeMerchantId={merchant.id}
      summary={{
        todayGrossSalesXof: snapshot.analyticsToday.grossSalesMinor,
        todayReceiptsXof: snapshot.analyticsToday.receiptsMinor,
        todayExpensesXof: snapshot.analyticsToday.expensesMinor,
        todaySaleCount: snapshot.todaySaleCount,
        outstandingBalancesXof: snapshot.outstandingBalancesMinor,
        analytics: mapAnalytics(snapshot.allTime),
        latestSales: snapshot.latestSales.map(mapSale),
        latestPayments: snapshot.latestPayments.map(mapPayment),
      }}
    />
  );
}
