import type { ScheduleLineDraft, ScheduleTerms } from "../types.js";
import { advancePaymentDate } from "../maturity.js";
import { buildScheduleAccrualWindows } from "./accrual-windows.js";
import { formatDateOnly, parseDateOnly } from "./dates.js";
import { computePeriodInterest } from "./period-interest.js";

export function buildBulletSchedule(terms: ScheduleTerms): ScheduleLineDraft[] {
  const first = parseDateOnly(terms.first_payment_date);
  if (!first) return [];

  const windows = buildScheduleAccrualWindows(terms);
  const lines: ScheduleLineDraft[] = [];
  let remaining = terms.principal;

  for (let period = 1; period <= terms.term_periods; period++) {
    const isLast = period === terms.term_periods;
    const interest = computePeriodInterest(remaining, terms, windows[period - 1]);
    const principalPortion = isLast ? remaining : 0;
    const payment = principalPortion + interest;
    remaining -= principalPortion;

    lines.push({
      period,
      payment_date: formatDateOnly(advancePaymentDate(first, period, terms.payment_frequency)),
      principal: principalPortion,
      interest,
      expected_payment: payment,
      closing_principal: remaining,
      carrying_amount: 0,
      eir_interest: 0,
      fee_income: 0,
      status: "scheduled",
    });
  }

  return lines;
}
