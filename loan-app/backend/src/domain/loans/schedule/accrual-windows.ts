import { advancePaymentDate } from "../maturity.js";
import type { PaymentFrequency, ScheduleTerms } from "../types.js";
import { formatDateOnly, parseDateOnly } from "./dates.js";

export type AccrualWindow = {
  start: Date;
  end: Date;
};

export function buildPaymentDates(
  firstPaymentDateIso: string,
  termPeriods: number,
  paymentFrequency: PaymentFrequency
): string[] {
  const first = parseDateOnly(firstPaymentDateIso);
  if (!first || termPeriods < 1) return [];

  return Array.from({ length: termPeriods }, (_, index) =>
    formatDateOnly(advancePaymentDate(first, index + 1, paymentFrequency))
  );
}

export function buildAccrualWindows(
  accrualStartDateIso: string,
  paymentDates: string[]
): AccrualWindow[] {
  const accrualStart = parseDateOnly(accrualStartDateIso);
  if (!accrualStart) return [];

  const windows: AccrualWindow[] = [];
  let periodStart = accrualStart;

  for (const paymentDateIso of paymentDates) {
    const periodEnd = parseDateOnly(paymentDateIso);
    if (!periodEnd) continue;
    windows.push({ start: periodStart, end: periodEnd });
    periodStart = periodEnd;
  }

  return windows;
}

export function buildScheduleAccrualWindows(terms: ScheduleTerms): AccrualWindow[] {
  const paymentDates = buildPaymentDates(
    terms.first_payment_date,
    terms.term_periods,
    terms.payment_frequency
  );
  return buildAccrualWindows(terms.accrual_start_date, paymentDates);
}
