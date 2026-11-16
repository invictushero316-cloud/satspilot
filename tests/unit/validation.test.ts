import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "@/server/validation/auth";
import { createMerchantSchema, merchantIdSchema } from "@/server/validation/merchant";

describe("input validation", () => {
  it("rejects invalid login payloads", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "short" }).success).toBe(
      false,
    );
  });

  it("accepts a valid login payload", () => {
    const result = loginSchema.safeParse({
      email: "merchant.demo@satspilot.local",
      password: "DemoMerchant1!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects weak registration passwords", () => {
    const result = registerSchema.safeParse({
      name: "Awa",
      email: "awa@example.com",
      password: "password",
    });
    expect(result.success).toBe(false);
  });

  it("requires a real merchant cuid", () => {
    expect(merchantIdSchema.safeParse("not-a-cuid").success).toBe(false);
    expect(
      merchantIdSchema.safeParse("clh3o5zqj0000qzrmn831i7rn").success,
    ).toBe(true);
  });


  it("validates merchant profile creation", () => {
    const result = createMerchantSchema.safeParse({
      name: "Marché Keur",
      locale: "fr",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayCurrency).toBe("XOF");
    }
  });
});
