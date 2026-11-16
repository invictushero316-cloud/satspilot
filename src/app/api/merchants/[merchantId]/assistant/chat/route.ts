import { auth } from "@/auth";
import { handleAssistantChat } from "@/server/ai/assistant";
import { jsonFromError, jsonOk } from "@/server/api/http";
import { UnauthorizedError } from "@/server/errors";
import { assertRateLimit } from "@/server/security/request-guards";

export const dynamic = "force-dynamic";

/**
 * Authenticated assistant chat.
 * Never accepts client-side "execute" flags — suggestions require a separate confirm action.
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
    assertRateLimit(`ai-route:${session.user.id}`, 30, 60_000);
    const body = (await request.json()) as Record<string, unknown>;

    // Strip any client mutation / secret fields before handling.
    // Never forward execute/confirm/pay flags from the client.
    const result = await handleAssistantChat(session.user.id, {
      merchantId,
      message: body.message,
      locale: body.locale,
    });

    return jsonOk(result);
  } catch (error) {
    return jsonFromError(error);
  }
}
