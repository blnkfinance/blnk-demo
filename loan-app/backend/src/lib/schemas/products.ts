import { z } from "zod";

export const interestTypeSchema = z.literal("fixed");

export const dayCountConventionSchema = z.enum([
  "actual_360",
  "actual_365",
  "30_360",
]);

export const paymentFrequencySchema = z.enum(["weekly", "biweekly", "monthly"]);

export const amortizationTypeSchema = z.enum([
  "equal_installments",
  "equal_principal",
  "bullet",
]);

export const gracePeriodTypeSchema = z.enum(["none", "interest_only", "full"]);

export const productStatusSchema = z.enum(["active", "archived"]);

const annualRateBpsSchema = z
  .number({ invalid_type_error: "Enter a rate between 0% and 100%." })
  .int("Enter a rate between 0% and 100%.")
  .min(0, "Enter a rate between 0% and 100%.")
  .max(10000, "Enter a rate between 0% and 100%.");

const gracePeriodDaysSchema = z
  .number({ invalid_type_error: "Enter the number of grace period days." })
  .int("Enter the number of grace period days.")
  .min(1, "Enter the number of grace period days.")
  .nullable();

export const createLoanProductSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a product name.")
      .max(200, "Product name must be 200 characters or fewer."),
    interest_type: interestTypeSchema,
    annual_rate_bps: annualRateBpsSchema,
    day_count_convention: dayCountConventionSchema,
    payment_frequency: paymentFrequencySchema,
    amortization_type: amortizationTypeSchema,
    grace_period_type: gracePeriodTypeSchema,
    grace_period_days: gracePeriodDaysSchema.optional().nullable(),
    status: z.never().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.grace_period_type === "none") {
      return;
    }
    if (data.grace_period_days == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter the number of grace period days.",
        path: ["grace_period_days"],
      });
    }
  });

export const updateLoanProductSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a product name.")
      .max(200, "Product name must be 200 characters or fewer.")
      .optional(),
    interest_type: interestTypeSchema.optional(),
    annual_rate_bps: annualRateBpsSchema.optional(),
    day_count_convention: dayCountConventionSchema.optional(),
    payment_frequency: paymentFrequencySchema.optional(),
    amortization_type: amortizationTypeSchema.optional(),
    grace_period_type: gracePeriodTypeSchema.optional(),
    grace_period_days: gracePeriodDaysSchema.optional().nullable(),
    status: z.never().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.grace_period_type === undefined) {
      return;
    }
    if (data.grace_period_type === "none") {
      return;
    }
    if (data.grace_period_days == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter the number of grace period days.",
        path: ["grace_period_days"],
      });
    }
  });

export const listProductsQuerySchema = z.object({
  status: productStatusSchema.default("active"),
  interest_type: interestTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateLoanProductInput = z.infer<typeof createLoanProductSchema>;
export type UpdateLoanProductInput = z.infer<typeof updateLoanProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
