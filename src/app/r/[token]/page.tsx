import { CustomerReceiptView } from "@/components/receipts/customer-receipt-view";
import { AppError } from "@/server/errors";
import { getReceiptByAccessToken } from "@/server/receipts/service";

export const dynamic = "force-dynamic";

export default async function CustomerReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let receipt = null;
  let errorMessage: string | null = null;
  try {
    receipt = await getReceiptByAccessToken(token);
  } catch (error) {
    errorMessage =
      error instanceof AppError ? error.message : "Receipt not found";
  }

  if (!receipt) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-navy">Receipt unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {errorMessage ?? "Receipt not found"}
        </p>
      </div>
    );
  }

  return <CustomerReceiptView receipt={receipt} />;
}
