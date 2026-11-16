import { z } from "zod";

export const currencySchema = z.literal("XOF");

export const productInputSchema = z.object({
  merchantId: z.string().cuid(),
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().max(80).optional(),
  unitPriceMinor: z.number().int().nonnegative(),
  currency: currencySchema.default("XOF"),
  trackStock: z.boolean().default(false),
  stockOnHand: z.number().int().nonnegative().nullable().optional(),
  active: z.boolean().default(true),
});

export const productUpdateSchema = productInputSchema
  .omit({ merchantId: true })
  .partial()
  .extend({
    productId: z.string().cuid(),
    merchantId: z.string().cuid(),
  });

export const saleLineSchema = z.object({
  productId: z.string().cuid().optional().nullable(),
  productName: z.string().trim().min(1).max(160),
  quantity: z.number().int().positive(),
  unitPriceMinor: z.number().int().nonnegative(),
  currency: currencySchema,
});

export const createSaleSchema = z.object({
  merchantId: z.string().cuid(),
  customerId: z.string().cuid().optional().nullable(),
  currency: currencySchema.default("XOF"),
  paymentMethod: z.enum(["CASH", "CREDIT"]),
  /** Initial cash tendered at sale time (0 for full credit). */
  cashPaidMinor: z.number().int().nonnegative().default(0),
  notes: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().trim().min(8).max(120),
  lines: z.array(saleLineSchema).min(1).max(50),
});

export const salePaymentSchema = z.object({
  merchantId: z.string().cuid(),
  saleId: z.string().cuid(),
  amountMinor: z.number().int().positive(),
  method: z.literal("CASH").default("CASH"),
  idempotencyKey: z.string().trim().min(8).max(120),
  description: z.string().trim().max(240).optional(),
});

export const customerInputSchema = z.object({
  merchantId: z.string().cuid(),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional(),
});

export const customerRepaymentSchema = z.object({
  merchantId: z.string().cuid(),
  customerId: z.string().cuid(),
  amountMinor: z.number().int().positive(),
  method: z.literal("CASH").default("CASH"),
  idempotencyKey: z.string().trim().min(8).max(120),
  description: z.string().trim().max(240).optional(),
});

export const expenseInputSchema = z.object({
  merchantId: z.string().cuid(),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(240),
  amountMinor: z.number().int().positive(),
  currency: currencySchema.default("XOF"),
  occurredOn: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  idempotencyKey: z.string().trim().min(8).max(120),
});

export const historyFilterSchema = z.object({
  merchantId: z.string().cuid(),
  from: z.string().optional(),
  to: z.string().optional(),
  paymentState: z
    .enum(["UNPAID", "PARTIALLY_PAID", "PAID"])
    .optional(),
  category: z.string().trim().optional(),
});
