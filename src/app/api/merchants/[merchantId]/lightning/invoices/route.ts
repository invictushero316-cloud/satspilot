import { auth } from "@/auth";
import { jsonFromError, jsonOk } from "@/server/api/http";
import { UnauthorizedError } from "@/server/errors";
import { createLightningInvoice } from "@/server/services/lightning";
import { assertRateLimit } from "@/server/security/request-guards";

export const dynamic = "force-dynamic";

/**
 * Create a Lightning invoice (make_invoice) for a SAT-denominated sale.
 * Settlement is never implied by this response — status starts as pending.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ merchantId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }
    const { merchantId } = await context.params;
    assertRateLimit(`ln-invoice:${session.user.id}`, 20, 60_000);
    assertRateLimit(`ln-invoice-m:${merchantId}`, 40, 60_000);

    const body = (await request.json()) as Record<string, unknown>;

    // Ignore any client-supplied paid / settled flags.
    const invoice = await createLightningInvoice(session.user.id, {
      merchantId,
      amountSats: body.amountSats,
      description: body.description,
      saleId: body.saleId,
      idempotencyKey: body.idempotencyKey,
      expirySeconds: body.expirySeconds ?? 900,
    });

    return jsonOk({ invoice }, 201);
  } catch (error) {
    return jsonFromError(error);
  }
}
