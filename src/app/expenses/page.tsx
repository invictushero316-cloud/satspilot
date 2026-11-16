import { ExpensesView } from "@/components/screens/expenses-view";
import { mapExpense } from "@/server/data/mappers";
import { requireMerchantPageContext } from "@/server/merchant-context";
import { listExpenses } from "@/server/services/expenses";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    merchantId?: string;
    from?: string;
    to?: string;
    category?: string;
  }>;
}) {
  const params = await searchParams;
  const { userId, merchants, merchant } = await requireMerchantPageContext(
    params.merchantId,
  );
  const expenses = await listExpenses(userId, {
    merchantId: merchant.id,
    from: params.from,
    to: params.to,
    category: params.category,
  });

  return (
    <ExpensesView
      merchants={merchants}
      activeMerchantId={merchant.id}
      expenses={expenses.map(mapExpense)}
      filters={{
        from: params.from,
        to: params.to,
        category: params.category,
      }}
    />
  );
}
