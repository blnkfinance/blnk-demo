import type {
  AmortizationType,
  DayCountConvention,
  GracePeriodType,
  PaymentFrequency,
} from "./types";

export function formatRate(annualRateBps: number, interestType: string): string {
  const pct = (annualRateBps / 100).toFixed(2).replace(/\.?0+$/, "");
  return `${pct}% ${interestType}`;
}

export const DAY_COUNT_LABELS: Record<DayCountConvention, string> = {
  actual_360: "Actual/360",
  actual_365: "Actual/365",
  "30_360": "30/360",
};

export const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
};

export const AMORTIZATION_LABELS: Record<AmortizationType, string> = {
  equal_installments: "Equal installments",
  equal_principal: "Equal principal",
  bullet: "Bullet",
};

export const GRACE_PERIOD_LABELS: Record<GracePeriodType, string> = {
  none: "None",
  interest_only: "Interest only",
  full: "Full",
};

export function formatStatus(status: string): string {
  return status === "active" ? "Active" : "Archived";
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
