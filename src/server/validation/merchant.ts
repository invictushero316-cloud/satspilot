import { z } from "zod";

export const createMerchantSchema = z.object({
  name: z.string().trim().min(2).max(120),
  displayCurrency: z.literal("XOF").default("XOF"),
  locale: z.enum(["en", "fr"]).default("en"),
  city: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
});

export const merchantIdSchema = z.string().cuid();

export type CreateMerchantInput = z.infer<typeof createMerchantSchema>;
