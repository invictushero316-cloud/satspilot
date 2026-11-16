import { auth } from "@/auth";
import { jsonFromError, jsonOk } from "@/server/api/http";
import { UnauthorizedError } from "@/server/errors";
import {
  connectNwcWallet,
  disconnectNwcWallet,
  getPublicWalletStatus,
} from "@/server/services/wallet";
import { assertRateLimit } from "@/server/security/request-guards";

export const dynamic = "force-dynamic";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return session.user.id;
}

/** Public wallet status — never includes NWC URI or ciphertext. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ merchantId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { merchantId } = await context.params;
    assertRateLimit(`wallet-status:${userId}`, 60, 60_000);
    const status = await getPublicWalletStatus(userId, merchantId);
    return jsonOk(status);
  } catch (error) {
    return jsonFromError(error);
  }
}

/** Connect NWC wallet. Body may include nwcUri once; it is never returned. */
export async function POST(
  request: Request,
  context: { params: Promise<{ merchantId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { merchantId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const result = await connectNwcWallet(userId, {
      merchantId,
      nwcUri: body.nwcUri,
      label: body.label,
    });
    // Explicitly omit any chance of echoing the URI.
    return jsonOk({
      connection: result.connection,
      capabilities: result.capabilities,
      includesPayInvoice: result.includesPayInvoice,
      warning: result.warning,
    });
  } catch (error) {
    return jsonFromError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ merchantId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { merchantId } = await context.params;
    assertRateLimit(`wallet-disconnect:${userId}`, 10, 60_000);
    const result = await disconnectNwcWallet(userId, merchantId);
    return jsonOk(result);
  } catch (error) {
    return jsonFromError(error);
  }
}
