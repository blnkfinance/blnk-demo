import type { ScheduleLineDraft, ScheduleTerms } from "../types.js";
import { advancePaymentDate } from "../maturity.js";
import { buildScheduleAccrualWindows } from "./accrual-windows.js";
import { usesActualDayCount } from "./day-count.js";
import { formatDateOnly, parseDateOnly } from "./dates.js";
import { computePeriodInterest } from "./period-interest.js";
import { periodicRateFromAnnualBps } from "./rates.js";

function roundMoney(n: number): number {
  return Math.round(n);
}

function computeNominalPmt(
  principal: number,
  periodicRate: number,
  periods: number
): number {
  if (periodicRate === 0) {
    return roundMoney(principal / periods);
  }
  const factor = Math.pow(1 + periodicRate, periods);
  return roundMoney((principal * periodicRate * factor) / (factor - 1));
}

export function buildEqualInstallmentsSchedule(terms: ScheduleTerms): ScheduleLineDraft[] {
  const first = parseDateOnly(terms.first_payment_date);
  if (!first) return [];

  const windows = buildScheduleAccrualWindows(terms);
  const periodicRate = periodicRateFromAnnualBps(
    terms.annual_rate_bps,
    terms.payment_frequency
  );
  const pmt = computeNominalPmt(terms.principal, periodicRate, terms.term_periods);
  const lines: ScheduleLineDraft[] = [];
  let remaining = terms.principal;

  for (let period = 1; period <= terms.term_periods; period++) {
    const isLast = period === terms.term_periods;
    const window = usesActualDayCount(terms.day_count_convention)
      ? windows[period - 1]
      : undefined;
    const interest = computePeriodInterest(remaining, terms, window);
    let principalPortion: number;
    let payment: number;

    if (isLast) {
      principalPortion = remaining;
      payment = principalPortion + interest;
    } else {
      payment = pmt;
      principalPortion = payment - interest;
    }

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
