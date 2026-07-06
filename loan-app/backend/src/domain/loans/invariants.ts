/** Pre-creation validation — pure, no I/O. Called before any schedule math. */
import type { CreateLoanInput, DomainResult, LoanProductSnapshot } from "./types.js";
import { domainErr, domainOk } from "./types.js";
import {
  MAX_FIRST_PAYMENT_FUTURE_YEARS,
  MAX_MONEY_MINOR,
  MAX_TERM_PERIODS,
} from "./limits.js";
import { parseDateOnly } from "./schedule/dates.js";

export type LoanProductForValidation = LoanProductSnapshot & {
  loan_product_id: string;
};

export function validateCreateLoanInput(
  product: LoanProductForValidation | null,
  input: CreateLoanInput,
  now: Date
): DomainResult<{ net_disbursement: number }> {
  if (!product) {
    return domainErr("We couldn't find that loan product.");
  }
  if (product.status !== "active") {
    return domainErr("This product is no longer active. Choose an active product.");
  }
  if (product.loan_product_id !== input.loan_product_id) {
    return domainErr("The selected product doesn't match.");
  }

  const blnkIdentityId = input.blnk_identity_id?.trim() ?? "";
  if (!blnkIdentityId) {
    return domainErr("Choose a customer.");
  }

  if (!Number.isInteger(input.principal) || input.principal <= 0) {
    return domainErr("Enter a loan amount greater than zero.");
  }
  if (input.principal > MAX_MONEY_MINOR) {
    return domainErr("Enter a loan amount below the maximum allowed.");
  }

  if (!Number.isInteger(input.origination_fee) || input.origination_fee < 0) {
    return domainErr("Enter a non-negative origination fee.");
  }
  if (input.origination_fee > MAX_MONEY_MINOR) {
    return domainErr("Enter an origination fee below the maximum allowed.");
  }
  if (input.origination_fee >= input.principal) {
    return domainErr("Origination fee must be less than the loan amount.");
  }

  const net_disbursement = input.principal - input.origination_fee;

  if (!Number.isInteger(input.term_periods) || input.term_periods <= 0) {
    return domainErr("Enter a term length of at least one period.");
  }
  if (input.term_periods > MAX_TERM_PERIODS) {
    return domainErr(`Enter a term length of at most ${MAX_TERM_PERIODS} periods.`);
  }

  const firstPayment = parseDateOnly(input.first_payment_date);
  if (!firstPayment) {
    return domainErr("Enter a valid first payment date.");
  }

  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const earliest = new Date(
    Date.UTC(today.getUTCFullYear() - 1, today.getUTCMonth(), today.getUTCDate())
  );
  if (firstPayment < earliest) {
    return domainErr("Choose a first payment date within the last year.");
  }

  const latest = new Date(
    Date.UTC(
      today.getUTCFullYear() + MAX_FIRST_PAYMENT_FUTURE_YEARS,
      today.getUTCMonth(),
      today.getUTCDate()
    )
  );
  if (firstPayment > latest) {
    return domainErr(
      `Choose a first payment date within the next ${MAX_FIRST_PAYMENT_FUTURE_YEARS} years.`
    );
  }

  return domainOk({ net_disbursement });
}
