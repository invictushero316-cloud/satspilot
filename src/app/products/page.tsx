import { ProductsView } from "@/components/screens/products-view";
import { mapProduct } from "@/server/data/mappers";
import { requireMerchantPageContext } from "@/server/merchant-context";
import { listProducts } from "@/server/services/products";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ merchantId?: string }>;
}) {
  const params = await searchParams;
  const { userId, merchants, merchant } = await requireMerchantPageContext(
    params.merchantId,
  );
  const products = await listProducts(userId, merchant.id);

  return (
    <ProductsView
      merchants={merchants}
      activeMerchantId={merchant.id}
      products={products.map(mapProduct)}
    />
  );
}
