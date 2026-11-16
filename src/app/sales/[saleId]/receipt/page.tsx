import { MerchantReceiptView } from "@/components/receipts/merchant-receipt-view";
import { requireMerchantMembership } from "@/server/authz/merchant";
import { prisma } from "@/server/db/prisma";
import { requireMerchantPageContext } from "@/server/merchant-context";
import {
  createReceiptForSale,
  getReceiptForMerchant,
} from "@/server/receipts/service";
import { AppError } from "@/server/errors";

export default async function MerchantSaleReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ saleId: string }>;
  searchParams: Promise<{ merchantId?: string }>;
}) {
  const { saleId } = await params;
  const query = await searchParams;
  const { userId, merchants, merchant } = await requireMerchantPageContext(
    query.merchantId,
  );
  await requireMerchantMembership(userId, merchant.id);

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, merchantId: merchant.id },
  });
  if (!sale) {
    return (
      <div className="p-6 text-sm text-danger">Sale not found for this merchant.</div>
    );
  }

  let receipt;
  try {
    receipt = await getReceiptForMerchant(userId, merchant.id, saleId);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      receipt = await createReceiptForSale(userId, saleId);
    } else {
      throw error;
    }
  }

  return (
    <MerchantReceiptView
      merchants={merchants}
      activeMerchantId={merchant.id}
      receipt={receipt}
      nostrPublishOptIn={Boolean(merchant.nostrPublishOptIn)}
    />
  );
}
