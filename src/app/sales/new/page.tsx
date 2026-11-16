import { NewSaleView } from "@/components/screens/new-sale-view";
import { mapCustomer, mapProduct } from "@/server/data/mappers";
import { requireMerchantPageContext } from "@/server/merchant-context";
import { listCustomersWithBalances } from "@/server/services/customers";
import { listProducts } from "@/server/services/products";

export default async function NewSalePage({
  searchParams,
}: {
  searchParams: Promise<{ merchantId?: string }>;
}) {
  const params = await searchParams;
  const { userId, merchants, merchant } = await requireMerchantPageContext(
    params.merchantId,
  );
  const [products, customers] = await Promise.all([
    listProducts(userId, merchant.id),
    listCustomersWithBalances(userId, merchant.id),
  ]);

  return (
    <NewSaleView
      merchants={merchants}
      activeMerchantId={merchant.id}
      products={products.map(mapProduct)}
      customers={customers.map(mapCustomer)}
    />
  );
}
