/**
 * Request/response validation for loan routes.
 *
 * Amounts are integers in smallest currency units (centavos).
 * Server derives net_disbursement, maturity_date, effective_annual_rate_bps,
 * and the full schedule — those are not accepted from the client.
 */
import { z } from "zod";
import { MAX_TERM_PERIODS } from "../../domain/loans/limits.js";
import {
  amortizationTypeSchema,
  dayCountConventionSchema,
  gracePeriodTypeSchema,
  paymentFrequencySchema,
} from "./products.js";

export const loanStatusSchema = z.enum([
  "pending_approval",
  "approved",
  "rejected",
]);

export const createLoanSchema = z.object({
  loan_product_id: z.string().trim().min(1, "Choose a loan product."),
  blnk_identity_id: z
    .string({
      required_error: "Choose a customer.",
      invalid_type_error: "Choose a customer.",
    })
    .trim()
    .min(1, "Choose a customer."),
  principal: z
    .number({ invalid_type_error: "Enter a loan amount greater than zero." })
    .int("Enter a loan amount greater than zero.")
    .positive("Enter a loan amount greater than zero."),
  origination_fee: z
    .number({ invalid_type_error: "Enter a non-negative origination fee." })
    .int("Enter a non-negative origination fee.")
    .min(0, "Enter a non-negative origination fee."),
  term_periods: z
    .number({ invalid_type_error: "Enter a term length of at least one period." })
    .int("Enter a term length of at least one period.")
    .positive("Enter a term length of at least one period.")
    .max(
      MAX_TERM_PERIODS,
      `Enter a term length of at most ${MAX_TERM_PERIODS} periods.`
    ),
  first_payment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid first payment date."),
});

export const listLoansQuerySchema = z.object({
  status: loanStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  include_customer: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const rejectLoanSchema = z.object({
  decision_note: z
    .string()
    .trim()
    .max(2000, "Decision note must be 2,000 characters or fewer.")
    .nullable()
    .optional(),
});

export const loanLedgerTransactionsQuerySchema = z.object({
  kind: z.enum(["interest_accrual", "principal_repayment"]),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export {
  amortizationTypeSchema,
  dayCountConventionSchema,
  gracePeriodTypeSchema,
  paymentFrequencySchema,
};
