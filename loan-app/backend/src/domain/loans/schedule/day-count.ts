import type { DayCountConvention } from "../types.js";

/** Actual calendar days between UTC date-only bounds (start inclusive, end exclusive). */
export function actualDaysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return Math.round(ms / 86_400_000);
}

export function usesActualDayCount(convention: DayCountConvention): boolean {
  return convention === "actual_360" || convention === "actual_365";
}

function dayCountDenominator(convention: DayCountConvention): number {
  switch (convention) {
    case "actual_360":
      return 360;
    case "actual_365":
      return 365;
    case "30_360":
      return 360;
  }
}

/** Contractual interest for one accrual window using Actual/360 or Actual/365. */
export function interestForPeriod(
  balance: number,
  annualRateBps: number,
  start: Date,
  end: Date,
  convention: "actual_360" | "actual_365"
): number {
  const days = actualDaysBetween(start, end);
  if (days <= 0 || balance <= 0) return 0;
  const annual = annualRateBps / 10_000;
  const denominator = dayCountDenominator(convention);
  return Math.round((balance * annual * days) / denominator);
}

export function interestForPeriodConvention(
  balance: number,
  annualRateBps: number,
  start: Date,
  end: Date,
  convention: DayCountConvention
): number {
  if (convention === "30_360") {
    throw new Error("30/360 interest accrual is not implemented; use nominal periodic rate.");
  }
  return interestForPeriod(balance, annualRateBps, start, end, convention);
}
