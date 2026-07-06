import { formatNumberWithCommas } from "../format";
import type { LoanStatus, SchedulePaymentStatus } from "./types";

/** Amounts are stored in smallest currency unit (centavos). */
export function formatMoney(amount: number): string {
  const major = amount / 100;
  return formatNumberWithCommas(major, 2);
}

export function formatRateBps(bps: number): string {
  const pct = (bps / 100).toFixed(2).replace(/\.?0+$/, "");
  return `${pct}%`;
}

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  pending_approval: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const SCHEDULE_PAYMENT_STATUS_LABELS: Record<
  SchedulePaymentStatus,
  string
> = {
  scheduled: "Scheduled",
  due: "Payment due",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
};

export {
  AMORTIZATION_LABELS,
  DAY_COUNT_LABELS,
  GRACE_PERIOD_LABELS,
  PAYMENT_FREQUENCY_LABELS,
} from "../products/labels";
