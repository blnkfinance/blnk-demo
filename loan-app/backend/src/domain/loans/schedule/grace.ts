import type { ScheduleLineDraft, ScheduleTerms } from "../types.js";
import { buildScheduleAccrualWindows } from "./accrual-windows.js";
import { buildEqualInstallmentsSchedule } from "./equal-installments.js";
import { computePeriodInterest } from "./period-interest.js";

/** Days per payment period for grace window conversion. */
function daysPerPeriod(frequency: ScheduleTerms["payment_frequency"]): number {
  switch (frequency) {
    case "monthly":
      return 30;
    case "biweekly":
      return 14;
    case "weekly":
      return 7;
  }
}

/**
 * Apply grace period adjustments to a base contractual schedule.
 * - interest_only: grace periods pay interest only (principal unchanged)
 * - full: zero payment; interest capitalizes into principal balance
 *
 * Uses day-count interest when terms.day_count_convention is Actual/360 or Actual/365.
 * 30/360 products use nominal periodic rate via computePeriodInterest.
 */
export function applyGracePeriod(
  lines: ScheduleLineDraft[],
  terms: ScheduleTerms
): ScheduleLineDraft[] {
  const { grace_period_type: gracePeriodType, grace_period_days: gracePeriodDays } =
    terms;

  if (gracePeriodType === "none" || gracePeriodDays == null || gracePeriodDays <= 0) {
    return lines;
  }

  const windows = buildScheduleAccrualWindows(terms);
  const gracePeriods = Math.min(
    lines.length,
    Math.max(1, Math.ceil(gracePeriodDays / daysPerPeriod(terms.payment_frequency)))
  );

  const result = lines.map((line) => ({ ...line }));
  let grossBalance = result[0]
    ? result[0].closing_principal + result[0].principal
    : 0;

  for (let i = 0; i < gracePeriods; i++) {
    const line = result[i]!;
    const openingGross =
      i === 0 ? grossBalance : result[i - 1]!.closing_principal;
    const interest = computePeriodInterest(openingGross, terms, windows[i]);

    if (gracePeriodType === "interest_only") {
      line.interest = interest;
      line.principal = 0;
      line.expected_payment = interest;
      line.closing_principal = openingGross;
    } else {
      line.interest = 0;
      line.principal = 0;
      line.expected_payment = 0;
      const capitalized = openingGross + interest;
      line.closing_principal = capitalized;
      grossBalance = capitalized;
    }
  }

  if (gracePeriodType === "full" && gracePeriods < result.length) {
    const remainingPeriods = result.length - gracePeriods;
    const newPrincipal = result[gracePeriods - 1]!.closing_principal;
    const remainingTerms: ScheduleTerms = {
      ...terms,
      principal: newPrincipal,
      term_periods: remainingPeriods,
      first_payment_date: result[gracePeriods]!.payment_date,
      accrual_start_date: result[gracePeriods - 1]!.payment_date,
    };
    const rebuilt = buildEqualInstallmentsSchedule(remainingTerms);

    for (let i = 0; i < rebuilt.length; i++) {
      const target = result[gracePeriods + i]!;
      const source = rebuilt[i]!;
      target.principal = source.principal;
      target.interest = source.interest;
      target.expected_payment = source.expected_payment;
      target.closing_principal = source.closing_principal;
    }
  }

  return result;
}
