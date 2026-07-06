import type { LoanStatus } from "./types";

export const DEFAULT_LOAN_LIST_STATUS: LoanStatus = "approved";

const LOAN_LIST_STATUSES: LoanStatus[] = [
  "pending_approval",
  "approved",
  "rejected",
];

export function parseLoanListStatus(
  value: string | null | undefined
): LoanStatus | null {
  if (value && LOAN_LIST_STATUSES.includes(value as LoanStatus)) {
    return value as LoanStatus;
  }
  return null;
}

export function loansListPath(status?: LoanStatus | null): string {
  if (status) {
    return `/loans?status=${encodeURIComponent(status)}`;
  }
  return "/loans";
}
