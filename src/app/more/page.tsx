import { MoreView } from "@/components/screens/more-view";
import { requireMerchantPageContext } from "@/server/merchant-context";

export default async function MorePage({
  searchParams,
}: {
  searchParams: Promise<{ merchantId?: string }>;
}) {
  const params = await searchParams;
  const { merchants, merchant } = await requireMerchantPageContext(
    params.merchantId,
  );

  return (
    <MoreView merchants={merchants} activeMerchantId={merchant.id} />
  );
}
