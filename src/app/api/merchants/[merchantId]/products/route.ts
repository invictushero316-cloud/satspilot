import { auth } from "@/auth";
import { jsonFromError, jsonOk } from "@/server/api/http";
import { listProductsForMerchant } from "@/server/data/merchants";
import { UnauthorizedError } from "@/server/errors";
import { assertRateLimit } from "@/server/security/request-guards";

export const dynamic = "force-dynamic";

/**
 * Example protected API route.
 * Merchant ID in the path is never sufficient — membership is re-checked.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ merchantId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const { merchantId } = await context.params;
    assertRateLimit(`products:${session.user.id}`, 60, 60_000);
    assertRateLimit(`products-m:${merchantId}`, 120, 60_000);

    const products = await listProductsForMerchant(
      session.user.id,
      merchantId,
    );
    return jsonOk({ products });
  } catch (error) {
    return jsonFromError(error);
  }
}
