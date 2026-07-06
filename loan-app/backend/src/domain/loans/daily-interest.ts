import {
  buildScheduleAccrualWindows,
  type AccrualWindow,
} from "./schedule/accrual-windows.js";
import { actualDaysBetween } from "./schedule/day-count.js";
import { addDaysUtc, formatDateOnly } from "./schedule/dates.js";
import type {
  AmortizationType,
  DayCountConvention,
  GracePeriodType,
  PaymentFrequency,
} from "./types.js";

export type DailyInterestEntry = {
  accrual_date: string;
  amount: number;
};

export type DailyInterestLoanTerms = {
  disbursement_date: string;
  first_payment_date: string;
  term_periods: number;
  annual_rate_bps: number;
  day_count_convention: DayCountConvention;
  payment_frequency: PaymentFrequency;
  amortization_type: AmortizationType;
  grace_period_type: GracePeriodType;
  grace_period_days: number | null;
  principal: number;
};

export type DailyInterestScheduleLine = {
  period: number;
  interest: number;
  principal: number;
  closing_principal: number;
};

function splitEvenlyWithTrueUp(total: number, parts: number): number[] {
  if (parts <= 0) return [];

  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from(
    { length: parts },
    (_, index) => base + (index < remainder ? 1 : 0)
  );
}

function buildFromEvenSplit(
  window: AccrualWindow,
  periodInterest: number
): DailyInterestEntry[] {
  const days = actualDaysBetween(window.start, window.end);
  if (days <= 0) return [];

  const amounts = splitEvenlyWithTrueUp(periodInterest, days);
  return amounts.map((amount, day) => ({
    accrual_date: formatDateOnly(addDaysUtc(window.start, day)),
    amount,
  }));
}

export function buildDailyInterestAmounts(input: {
  loan: DailyInterestLoanTerms;
  line: DailyInterestScheduleLine;
}): DailyInterestEntry[] {
  const { loan, line } = input;
  if (line.interest <= 0) return [];

  const windows = buildScheduleAccrualWindows({
    principal: loan.principal,
    term_periods: loan.term_periods,
    first_payment_date: loan.first_payment_date,
    accrual_start_date: loan.disbursement_date,
    annual_rate_bps: loan.annual_rate_bps,
    day_count_convention: loan.day_count_convention,
    payment_frequency: loan.payment_frequency,
    amortization_type: loan.amortization_type,
    grace_period_type: loan.grace_period_type,
    grace_period_days: loan.grace_period_days,
  });

  const window = windows[line.period - 1];
  if (!window) return [];

  return buildFromEvenSplit(window, line.interest);
}
