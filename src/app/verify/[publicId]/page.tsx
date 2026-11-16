import { PublicVerifyView } from "@/components/receipts/public-verify-view";
import { AppError } from "@/server/errors";
import { getPublicVerification } from "@/server/receipts/service";

export const dynamic = "force-dynamic";

export default async function PublicVerifyPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  let data = null;
  let errorMessage: string | null = null;
  try {
    data = await getPublicVerification(publicId);
  } catch (error) {
    errorMessage =
      error instanceof AppError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Receipt not found";
    // Normalize DB / infra failures for public UX
    if (/connect|ECONNREFUSED|P1001|timeout/i.test(errorMessage)) {
      errorMessage = "Receipt service temporarily unavailable";
    }
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-navy">Cannot verify</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {errorMessage ?? "Receipt not found"}
        </p>
      </div>
    );
  }

  return <PublicVerifyView data={data} />;
}
