import type { ScheduleTerms } from "../types.js";
import type { AccrualWindow } from "./accrual-windows.js";
import { interestForPeriodConvention, usesActualDayCount } from "./day-count.js";
import { periodicRateFromAnnualBps } from "./rates.js";

function roundMoney(n: number): number {
  return Math.round(n);
}

/** Contractual interest for one period — Actual day count or nominal periodic rate. */
export function computePeriodInterest(
  balance: number,
  terms: ScheduleTerms,
  window: AccrualWindow | undefined
): number {
  if (balance <= 0) return 0;

  if (usesActualDayCount(terms.day_count_convention) && window) {
    return interestForPeriodConvention(
      balance,
      terms.annual_rate_bps,
      window.start,
      window.end,
      terms.day_count_convention
    );
  }

  const periodicRate = periodicRateFromAnnualBps(
    terms.annual_rate_bps,
    terms.payment_frequency
  );
  return roundMoney(balance * periodicRate);
}
