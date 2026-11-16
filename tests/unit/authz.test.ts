import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/db/prisma", () => {
  return {
    prisma: {
      merchantMembership: {
        findUnique: vi.fn(),
      },
    },
  };
});

import { prisma } from "@/server/db/prisma";
import { requireMerchantMembership } from "@/server/authz/merchant";
import { ForbiddenError, UnauthorizedError } from "@/server/errors";

describe("merchant authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies unauthenticated access", async () => {
    await expect(
      requireMerchantMembership(null, "clh3o5zqj0000qzrmn831i7rn"),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("denies cross-merchant access when membership is missing", async () => {
    vi.mocked(prisma.merchantMembership.findUnique).mockResolvedValue(null);

    await expect(
      requireMerchantMembership("user_a", "clh3o5zqj0000qzrmn831i7rn"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows access only when membership exists for the user", async () => {
    const merchantId = "clh3o5zqj0000qzrmn831i7rn";

    vi.mocked(prisma.merchantMembership.findUnique).mockResolvedValue({
      id: "mem_1",
      userId: "user_a",
      merchantId,
      role: "OWNER",
      createdAt: new Date(),
      updatedAt: new Date(),
      merchant: {
        id: merchantId,
        name: "Demo",
        displayCurrency: "XOF",
        locale: "en",
        city: null,
        phone: null,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as never);

    const access = await requireMerchantMembership("user_a", merchantId);
    expect(access.merchantId).toBe(merchantId);
    expect(access.role).toBe("OWNER");
    expect(prisma.merchantMembership.findUnique).toHaveBeenCalledWith({
      where: {
        userId_merchantId: { userId: "user_a", merchantId },
      },
      include: { merchant: true },
    });
  });
});
