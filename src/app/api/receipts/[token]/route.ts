import { jsonFromError, jsonOk } from "@/server/api/http";
import { getReceiptByAccessToken } from "@/server/receipts/service";
import {
  assertRateLimit,
  clientRateKey,
} from "@/server/security/request-guards";

export const dynamic = "force-dynamic";

/** Customer receipt by bearer access token — no auth cookie required. */
export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    assertRateLimit(
      `receipt-token:${clientRateKey(request, "anon")}`,
      60,
      60_000,
    );
    const { token } = await context.params;
    const receipt = await getReceiptByAccessToken(token);
    return jsonOk(receipt);
  } catch (error) {
    return jsonFromError(error);
  }
}
