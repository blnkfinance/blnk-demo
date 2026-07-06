import type { PaymentFrequency } from "../types.js";

/**
 * Contract rate → nominal periodic rate (simple division).
 * Used for PMT / contractual interest accrual on gross principal.
 */
export function periodicRateFromAnnualBps(
  annualRateBps: number,
  frequency: PaymentFrequency
): number {
  const annual = annualRateBps / 10_000;
  switch (frequency) {
    case "monthly":
      return annual / 12;
    case "biweekly":
      return annual / 26;
    case "weekly":
      return annual / 52;
  }
}

/**
 * EIR → periodic rate (compound conversion).
 * Used for amortized-cost roll-forward after IRR is solved.
 */
export function periodicRateFromEffectiveAnnualBps(
  effectiveAnnualRateBps: number,
  frequency: PaymentFrequency
): number {
  const annual = effectiveAnnualRateBps / 10_000;
  switch (frequency) {
    case "monthly":
      return Math.pow(1 + annual, 1 / 12) - 1;
    case "biweekly":
      return Math.pow(1 + annual, 1 / 26) - 1;
    case "weekly":
      return Math.pow(1 + annual, 1 / 52) - 1;
  }
}

export function annualizePeriodicRateToBps(
  periodicRate: number,
  frequency: PaymentFrequency
): number {
  let annual: number;
  switch (frequency) {
    case "monthly":
      annual = Math.pow(1 + periodicRate, 12) - 1;
      break;
    case "biweekly":
      annual = Math.pow(1 + periodicRate, 26) - 1;
      break;
    case "weekly":
      annual = Math.pow(1 + periodicRate, 52) - 1;
      break;
  }
  return Math.round(annual * 10_000);
}
