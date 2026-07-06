import type { Response } from "express";
import type { z } from "zod";

export type FieldErrors = Record<string, string>;

export type ApiErrorBody = {
  ok: false;
  error: string;
  field_errors?: FieldErrors;
};

export function validationError(
  error: string,
  field_errors?: FieldErrors
): ApiErrorBody {
  if (field_errors && Object.keys(field_errors).length > 0) {
    return { ok: false, error, field_errors };
  }
  return { ok: false, error };
}

function pathToFieldKey(path: (string | number)[]): string {
  if (path.length === 0) return "_form";
  return String(path[0]);
}

export function zodToFieldErrors(error: z.ZodError): FieldErrors {
  const field_errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = pathToFieldKey(issue.path);
    if (!field_errors[key]) {
      field_errors[key] = issue.message;
    }
  }
  return field_errors;
}

export function zodSummary(_error: z.ZodError, field_errors: FieldErrors): string {
  const keys = Object.keys(field_errors);
  if (keys.length === 0) return "Fix the highlighted fields.";
  if (keys.length === 1) return field_errors[keys[0]!]!;
  return "Fix the highlighted fields.";
}

export function zodValidationResponse(error: z.ZodError): ApiErrorBody {
  const field_errors = zodToFieldErrors(error);
  return validationError(zodSummary(error, field_errors), field_errors);
}

export function domainValidationResponse(
  error: string,
  fieldMap: Record<string, string>
): ApiErrorBody {
  const fieldKey = fieldMap[error];
  if (fieldKey) {
    return validationError(error, { [fieldKey]: error });
  }
  return validationError(error);
}

export function sendValidationError(res: Response, body: ApiErrorBody): void {
  res.status(400).json(body);
}

export const LOAN_CREATE_FIELD_MAP: Record<string, string> = {
  "Choose a loan product.": "loan_product_id",
  "Enter a loan amount greater than zero.": "principal",
  "Enter a non-negative origination fee.": "origination_fee",
  "Origination fee must be less than the loan amount.": "origination_fee",
  "Enter a term length of at least one period.": "term_periods",
  "Enter a term length of at most 600 periods.": "term_periods",
  "Enter a valid first payment date.": "first_payment_date",
  "Choose a first payment date within the last year.": "first_payment_date",
  "Choose a first payment date within the next 5 years.": "first_payment_date",
  "Enter a loan amount below the maximum allowed.": "principal",
  "Enter an origination fee below the maximum allowed.": "origination_fee",
  "The payment schedule includes negative principal; adjust the term or first payment date.":
    "first_payment_date",
  "This product is no longer active. Choose an active product.": "loan_product_id",
  "Choose a customer.": "blnk_identity_id",
  "This customer is not qualified to apply for a loan.":
    "blnk_identity_id",
};
