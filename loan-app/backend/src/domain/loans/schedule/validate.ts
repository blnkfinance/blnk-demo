import type { DomainResult, ScheduleLineDraft } from "../types.js";
import { domainErr, domainOk } from "../types.js";

function isSafeMoneyInteger(value: number): boolean {
  return Number.isInteger(value) && Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
}

export function validateScheduleDraft(
  schedule: ScheduleLineDraft[],
  options: { allowNegativeAmortization?: boolean } = {}
): DomainResult<void> {
  const { allowNegativeAmortization = false } = options;

  for (const line of schedule) {
    const amounts = [
      line.principal,
      line.interest,
      line.expected_payment,
      line.closing_principal,
      line.carrying_amount,
      line.eir_interest,
      line.fee_income,
    ];

    for (const amount of amounts) {
      if (!isSafeMoneyInteger(amount)) {
        return domainErr("Loan amounts must be valid whole currency units.");
      }
    }

    if (line.expected_payment < 0) {
      return domainErr("The payment schedule includes a negative installment.");
    }

    if (!allowNegativeAmortization && line.principal < 0) {
      return domainErr(
        "The payment schedule includes negative principal; adjust the term or first payment date."
      );
    }
  }

  for (let i = 0; i < schedule.length - 1; i++) {
    const line = schedule[i]!;
    const next = schedule[i + 1]!;
    const impliedNext =
      line.carrying_amount + line.eir_interest - line.expected_payment;
    if (impliedNext !== next.carrying_amount) {
      return domainErr("The amortized cost schedule is internally inconsistent.");
    }
  }

  if (schedule.length > 0) {
    const last = schedule[schedule.length - 1]!;
    const finalCarrying =
      last.carrying_amount + last.eir_interest - last.expected_payment;
    if (finalCarrying !== 0) {
      return domainErr("The amortized cost schedule does not close to zero.");
    }
  }

  return domainOk(undefined);
}
