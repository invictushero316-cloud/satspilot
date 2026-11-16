import "server-only";

import { requireMerchantMembership } from "@/server/authz/merchant";
import { prisma } from "@/server/db/prisma";
import { AppError, ValidationError } from "@/server/errors";
import {
  productInputSchema,
  productUpdateSchema,
} from "@/server/validation/bookkeeping";

export async function createProduct(
  userId: string,
  input: unknown,
) {
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Invalid product", parsed.error.issues);
  }
  const data = parsed.data;
  await requireMerchantMembership(userId, data.merchantId);

  if (data.trackStock && data.stockOnHand == null) {
    throw new ValidationError("stockOnHand is required when trackStock is true");
  }
  if (!data.trackStock && data.stockOnHand != null) {
    throw new ValidationError("stockOnHand must be null when trackStock is false");
  }

  return prisma.product.create({
    data: {
      merchantId: data.merchantId,
      name: data.name,
      category: data.category,
      unitPriceMinor: data.unitPriceMinor,
      currency: data.currency,
      trackStock: data.trackStock,
      stockOnHand: data.trackStock ? data.stockOnHand : null,
      active: data.active,
      status: "ACTIVE",
    },
  });
}

export async function updateProduct(userId: string, input: unknown) {
  const parsed = productUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Invalid product update", parsed.error.issues);
  }
  const data = parsed.data;
  await requireMerchantMembership(userId, data.merchantId);

  const existing = await prisma.product.findFirst({
    where: { id: data.productId, merchantId: data.merchantId },
  });
  if (!existing || existing.status !== "ACTIVE") {
    throw new AppError("NOT_FOUND", "Product not found", 404);
  }

  const trackStock = data.trackStock ?? existing.trackStock;
  const stockOnHand =
    data.stockOnHand !== undefined ? data.stockOnHand : existing.stockOnHand;

  if (trackStock && stockOnHand == null) {
    throw new ValidationError("stockOnHand is required when trackStock is true");
  }

  return prisma.product.update({
    where: { id: existing.id },
    data: {
      name: data.name ?? existing.name,
      category: data.category ?? existing.category,
      unitPriceMinor: data.unitPriceMinor ?? existing.unitPriceMinor,
      currency: data.currency ?? existing.currency,
      trackStock,
      stockOnHand: trackStock ? stockOnHand : null,
      active: data.active ?? existing.active,
    },
  });
}

export async function archiveProduct(
  userId: string,
  merchantId: string,
  productId: string,
) {
  await requireMerchantMembership(userId, merchantId);
  const existing = await prisma.product.findFirst({
    where: { id: productId, merchantId },
  });
  if (!existing) {
    throw new AppError("NOT_FOUND", "Product not found", 404);
  }
  return prisma.product.update({
    where: { id: productId },
    data: { status: "ARCHIVED", active: false },
  });
}

export async function listProducts(userId: string, merchantId: string) {
  await requireMerchantMembership(userId, merchantId);
  return prisma.product.findMany({
    where: { merchantId, status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
}
