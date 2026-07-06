/**
 * Effective interest rate (EIR) solver and amortized-cost roll-forward.
 *
 * Contractual payments are sized on gross principal at the contract rate, but only
 * net_disbursement was lent. EIR is the rate that equates the PV of expected payments
 * to net_disbursement — it is always >= contract rate when an origination fee is withheld.
 *
 * applyEirAmortization fills carrying_amount, eir_interest, and fee_income:
 *   eir_interest = interest + fee_income  (every row)
 *   sum(fee_income) = origination_fee     (exact, last-period rebalance)
 *
 * Actual/360 and Actual/365 use calendar accrual windows (XNPV-style discounting).
 * 30/360 uses nominal period-index discounting.
 */
import type { AccrualWindow } from "./schedule/accrual-windows.js";
import {
  actualDaysBetween,
  usesActualDayCount,
} from "./schedule/day-count.js";
import { parseDateOnly } from "./schedule/dates.js";
import {
  annualizePeriodicRateToBps,
  periodicRateFromEffectiveAnnualBps,
} from "./schedule/rates.js";
import type {
  DayCountConvention,
  PaymentFrequency,
  ScheduleLineDraft,
} from "./types.js";

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

function eirInterestForWindow(
  balance: number,
  effectiveAnnualRateBps: number,
  window: AccrualWindow,
  convention: DayCountConvention
): number {
  const days = actualDaysBetween(window.start, window.end);
  if (days <= 0 || balance <= 0) return 0;
  const annual = effectiveAnnualRateBps / 10_000;
  const denominator = dayCountDenominator(convention);
  const yearFraction = days / denominator;
  const periodRate = Math.pow(1 + annual, yearFraction) - 1;
  return Math.round(balance * periodRate);
}

/** PV(payments) − opening; zero when periodicRate is the correct IRR (30/360). */
function pvAtPeriodicRate(
  opening: number,
  schedule: ScheduleLineDraft[],
  periodicRate: number
): number {
  let pv = 0;
  for (let i = 0; i < schedule.length; i++) {
    const payment = schedule[i]!.expected_payment;
    const t = i + 1;
    pv += payment / Math.pow(1 + periodicRate, t);
  }
  return pv - opening;
}

/** PV(payments) − opening; zero when annualRate is the correct EIR (actual day count). */
export function actualDayCountPresentValueResidual(
  opening: number,
  schedule: ScheduleLineDraft[],
  accrualStartDate: string,
  annualRateBps: number,
  convention: DayCountConvention
): number {
  return pvAtActualDayCountRate(
    opening,
    schedule,
    accrualStartDate,
    annualRateBps / 10_000,
    convention
  );
}

/** PV(payments) − opening; zero when annualRate is the correct EIR (actual day count). */
function pvAtActualDayCountRate(
  opening: number,
  schedule: ScheduleLineDraft[],
  accrualStartDate: string,
  annualRate: number,
  convention: DayCountConvention
): number {
  const start = parseDateOnly(accrualStartDate);
  if (!start) return -opening;

  const denom = dayCountDenominator(convention);
  let pv = 0;
  for (const line of schedule) {
    const paymentDate = parseDateOnly(line.payment_date);
    if (!paymentDate) continue;
    const days = actualDaysBetween(start, paymentDate);
    const yearFraction = days / denom;
    pv += line.expected_payment / Math.pow(1 + annualRate, yearFraction);
  }
  return pv - opening;
}

function findPositiveRateUpperBound(
  residualAtRate: (rate: number) => number
): number {
  let hi = 1;
  while (residualAtRate(hi) > 0) {
    hi *= 2;
    if (!Number.isFinite(hi)) {
      throw new RangeError(
        "The loan cash flows do not produce a representable non-negative effective interest rate."
      );
    }
  }
  return hi;
}

function solvePeriodicRate(
  opening: number,
  schedule: ScheduleLineDraft[]
): number {
  let lo = 0;
  let hi = findPositiveRateUpperBound((rate) =>
    pvAtPeriodicRate(opening, schedule, rate)
  );

  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    const f = pvAtPeriodicRate(opening, schedule, mid);
    if (Math.abs(f) < 0.5) {
      return mid;
    }
    if (f > 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2;
}

function solveActualDayCountAnnualRate(
  opening: number,
  schedule: ScheduleLineDraft[],
  accrualStartDate: string,
  convention: DayCountConvention
): number {
  let lo = 0;
  let hi = findPositiveRateUpperBound((rate) =>
    pvAtActualDayCountRate(
      opening,
      schedule,
      accrualStartDate,
      rate,
      convention
    )
  );

  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    const f = pvAtActualDayCountRate(
      opening,
      schedule,
      accrualStartDate,
      mid,
      convention
    );
    if (Math.abs(f) < 0.5) {
      return mid;
    }
    if (f > 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2;
}

export function computeEffectiveAnnualRateBps(input: {
  opening_carrying_amount: number;
  schedule: ScheduleLineDraft[];
  payment_frequency: PaymentFrequency;
  day_count_convention: DayCountConvention;
  accrual_start_date: string;
}): number {
  const {
    opening_carrying_amount,
    schedule,
    payment_frequency,
    day_count_convention,
    accrual_start_date,
  } = input;
  if (schedule.length === 0) return 0;

  const totalPayments = schedule.reduce((sum, line) => sum + line.expected_payment, 0);
  if (totalPayments === opening_carrying_amount) {
    return 0;
  }

  if (usesActualDayCount(day_count_convention)) {
    const annualRate = solveActualDayCountAnnualRate(
      opening_carrying_amount,
      schedule,
      accrual_start_date,
      day_count_convention
    );
    return Math.round(annualRate * 10_000);
  }

  const periodicRate = solvePeriodicRate(opening_carrying_amount, schedule);
  return annualizePeriodicRateToBps(periodicRate, payment_frequency);
}

export function applyEirAmortization(input: {
  schedule: ScheduleLineDraft[];
  opening_carrying_amount: number;
  origination_fee: number;
  effective_annual_rate_bps: number;
  payment_frequency: PaymentFrequency;
  day_count_convention: DayCountConvention;
  accrual_windows: AccrualWindow[];
}): ScheduleLineDraft[] {
  const {
    schedule,
    opening_carrying_amount,
    origination_fee,
    effective_annual_rate_bps,
    payment_frequency,
    day_count_convention,
    accrual_windows,
  } = input;

  const useActual = usesActualDayCount(day_count_convention);
  const r = useActual
    ? 0
    : periodicRateFromEffectiveAnnualBps(effective_annual_rate_bps, payment_frequency);
  const result = schedule.map((line) => ({ ...line }));
  const n = result.length;
  if (n === 0) return result;

  let prevClosing = opening_carrying_amount;

  // Step A: roll forward amortized cost. carrying_amount = opening balance each period.
  for (let i = 0; i < n; i++) {
    const line = result[i]!;
    const isLast = i === n - 1;
    line.carrying_amount = prevClosing;

    if (isLast) {
      line.eir_interest = line.expected_payment - line.carrying_amount;
    } else if (useActual) {
      const window = accrual_windows[i];
      if (origination_fee === 0) {
        line.eir_interest = line.interest;
      } else {
        line.eir_interest = window
          ? eirInterestForWindow(
              line.carrying_amount,
              effective_annual_rate_bps,
              window,
              day_count_convention
            )
          : 0;
      }
    } else {
      line.eir_interest = Math.round(line.carrying_amount * r);
    }

    prevClosing = line.carrying_amount + line.eir_interest - line.expected_payment;
  }

  if (origination_fee === 0) {
    for (const line of result) {
      line.fee_income = 0;
    }
    return result;
  }

  // Step B: split eir_interest into contractual interest + fee recognition.
  let feeSum = 0;
  for (let i = 0; i < n - 1; i++) {
    const line = result[i]!;
    line.fee_income = line.eir_interest - line.interest;
    feeSum += line.fee_income;
  }

  const last = result[n - 1]!;
  last.fee_income = origination_fee - feeSum;
  last.eir_interest = last.interest + last.fee_income;

  return result;
}
