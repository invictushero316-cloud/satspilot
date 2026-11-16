"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { createMerchantSchema } from "@/server/validation/merchant";

export type MerchantActionResult =
  | { ok: true; merchantId: string }
  | { ok: false; error: string };

export async function createMerchantAction(
  _prev: MerchantActionResult | null,
  formData: FormData,
): Promise<MerchantActionResult> {
  const session = await requireSession();

  const parsed = createMerchantSchema.safeParse({
    name: formData.get("name"),
    displayCurrency: formData.get("displayCurrency") || "XOF",
    locale: formData.get("locale") || "en",
    city: formData.get("city") || undefined,
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid merchant profile",
    };
  }

  const merchant = await prisma.$transaction(async (tx) => {
    const created = await tx.merchant.create({
      data: {
        name: parsed.data.name,
        displayCurrency: parsed.data.displayCurrency,
        locale: parsed.data.locale,
        city: parsed.data.city,
        phone: parsed.data.phone,
        status: "ACTIVE",
      },
    });

    await tx.merchantMembership.create({
      data: {
        userId: session.user.id,
        merchantId: created.id,
        role: "OWNER",
      },
    });

    await tx.auditEvent.create({
      data: {
        merchantId: created.id,
        actorUserId: session.user.id,
        action: "merchant.created",
        resourceType: "merchant",
        resourceId: created.id,
        metadata: { name: created.name },
      },
    });

    return created;
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard?merchantId=${merchant.id}`);
}
