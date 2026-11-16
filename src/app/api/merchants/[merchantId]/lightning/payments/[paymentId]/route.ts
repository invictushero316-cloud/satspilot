import { auth } from "@/auth";
import { jsonFromError, jsonOk } from "@/server/api/http";
import { UnauthorizedError } from "@/server/errors";
import {
  getLightningPaymentForResume,
  lookupLightningPaymentStatus,
} from "@/server/services/lightning";
import { assertRateLimit } from "@/server/security/request-guards";

export const dynamic = "force-dynamic";

/**
 * Resume a Lightning payment after reload (invoice + status from DB).
 * Does not call the wallet provider — use POST for verified lookup.
 */
export async function GET(
  _request: Request,
  context: {
    params: Promise<{ merchantId: string; paymentId: string }>;
  },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }
    const { merchantId, paymentId } = await context.params;
    assertRateLimit(`ln-resume:${session.user.id}`, 60, 60_000);
    assertRateLimit(`ln-resume-m:${merchantId}`, 120, 60_000);
    const invoice = await getLightningPaymentForResume(
      session.user.id,
      merchantId,
      paymentId,
    );
    return jsonOk({ invoice });
  } catch (error) {
    return jsonFromError(error);
  }
}

/**
 * Authenticated settlement poll via lookup_invoice.
 * Client-supplied paid=true is ignored; only provider settlement counts.
 */
export async function POST(
  request: Request,
  context: {
    params: Promise<{ merchantId: string; paymentId: string }>;
  },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }
    const { merchantId, paymentId } = await context.params;
    assertRateLimit(`ln-poll:${session.user.id}`, 40, 60_000);

    // Discard body claims about payment status if present.
    if (request.headers.get("content-type")?.includes("application/json")) {
      try {
        await request.json();
      } catch {
        // empty body is fine
      }
    }

    const result = await lookupLightningPaymentStatus(
      session.user.id,
      merchantId,
      paymentId,
    );
    return jsonOk(result);
  } catch (error) {
    return jsonFromError(error);
  }
}
