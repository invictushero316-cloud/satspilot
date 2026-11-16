import "server-only";

import { redirect } from "next/navigation";

import { requireSession } from "@/server/auth/session";
import {
  getMerchantsForUser,
  resolveActiveMerchant,
} from "@/server/data/merchants";
import { ForbiddenError, UnauthorizedError } from "@/server/errors";

export async function requireMerchantPageContext(
  preferredMerchantId?: string | null,
) {
  try {
    const session = await requireSession();
    const merchants = await getMerchantsForUser(session.user.id);

    if (merchants.length === 0) {
      redirect("/onboarding");
    }

    const merchant = await resolveActiveMerchant(
      session.user.id,
      preferredMerchantId,
    );

    return {
      userId: session.user.id,
      merchants,
      merchant,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    if (error instanceof ForbiddenError) {
      redirect("/onboarding");
    }
    throw error;
  }
}
