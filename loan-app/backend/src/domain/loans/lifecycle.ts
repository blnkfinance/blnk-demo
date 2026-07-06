/**
 * Loan lifecycle guards — approve/reject transitions only.
 *
 * Terminal states (approved, rejected) have no outbound transitions.
 * Deal terms and schedule are never mutated; only status fields change at the DB layer.
 */
import type { LoanStatus } from "./types.js";
import { domainErr, domainOk, type DomainResult } from "./types.js";

const VALID_TRANSITIONS: Record<LoanStatus, LoanStatus[]> = {
  pending_approval: ["approved", "rejected"],
  approved: [],
  rejected: [],
};

export function canTransition(from: LoanStatus, to: LoanStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function approveLoan(currentStatus: LoanStatus): DomainResult<{ status: "approved" }> {
  if (currentStatus !== "pending_approval") {
    return domainErr("This loan is not awaiting approval, so it can't be approved.");
  }
  return domainOk({ status: "approved" });
}

export function rejectLoan(currentStatus: LoanStatus): DomainResult<{ status: "rejected" }> {
  if (currentStatus !== "pending_approval") {
    return domainErr("This loan is not awaiting approval, so it can't be rejected.");
  }
  return domainOk({ status: "rejected" });
}
