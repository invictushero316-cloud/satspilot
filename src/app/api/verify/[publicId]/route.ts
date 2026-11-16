import { jsonFromError, jsonOk } from "@/server/api/http";
import { getPublicVerification } from "@/server/receipts/service";
import {
  assertRateLimit,
  clientRateKey,
} from "@/server/security/request-guards";

/** Public verification payload — no personal data / no line items. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ publicId: string }> },
) {
  try {
    assertRateLimit(
      `receipt-verify:${clientRateKey(request, "anon")}`,
      60,
      60_000,
    );
    const { publicId } = await context.params;
    const result = await getPublicVerification(publicId);
    return jsonOk(result);
  } catch (error) {
    return jsonFromError(error);
  }
}
