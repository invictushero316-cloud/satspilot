import { CustomersView } from "@/components/screens/customers-view";
import { mapCustomer } from "@/server/data/mappers";
import { requireMerchantPageContext } from "@/server/merchant-context";
import { listCustomersWithBalances } from "@/server/services/customers";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ merchantId?: string }>;
}) {
  const params = await searchParams;
  const { userId, merchants, merchant } = await requireMerchantPageContext(
    params.merchantId,
  );
  const customers = await listCustomersWithBalances(userId, merchant.id);

  return (
    <CustomersView
      merchants={merchants}
      activeMerchantId={merchant.id}
      customers={customers.map(mapCustomer)}
    />
  );
}
