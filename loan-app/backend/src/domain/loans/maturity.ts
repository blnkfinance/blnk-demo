import type { PaymentFrequency } from "./types.js";
import { addDaysUtc, addMonthsUtc, formatDateOnly, parseDateOnly } from "./schedule/dates.js";

/** Advance from first_payment_date by (periodIndex - 1) steps. Period 1 = first due date. */
export function advancePaymentDate(
  firstPaymentDate: Date,
  periodIndex: number,
  frequency: PaymentFrequency
): Date {
  const steps = periodIndex - 1;
  if (steps <= 0) return firstPaymentDate;
  switch (frequency) {
    case "monthly":
      return addMonthsUtc(firstPaymentDate, steps);
    case "biweekly":
      return addDaysUtc(firstPaymentDate, steps * 14);
    case "weekly":
      return addDaysUtc(firstPaymentDate, steps * 7);
  }
}

/** Maturity = due date of the final period (first date + termPeriods - 1 steps). */
export function computeMaturityDate(
  firstPaymentDateIso: string,
  termPeriods: number,
  paymentFrequency: PaymentFrequency
): string | null {
  const first = parseDateOnly(firstPaymentDateIso);
  if (!first || termPeriods < 1) return null;
  const maturity = advancePaymentDate(first, termPeriods, paymentFrequency);
  return formatDateOnly(maturity);
}
