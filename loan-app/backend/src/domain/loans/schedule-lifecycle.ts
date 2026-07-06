/**
 * Schedule payment status — the only mutable field on loan_schedule rows.
 */
import type { LoanStatus, SchedulePaymentStatus } from "./types.js";
import { domainErr, domainOk, type DomainResult } from "./types.js";

const PAYABLE_STATUSES: SchedulePaymentStatus[] = ["scheduled", "due", "overdue"];

export function markScheduleLineDue(
  loanStatus: LoanStatus,
  lineStatus: SchedulePaymentStatus
): DomainResult<{ status: "due" }> {
  if (loanStatus !== "approved") {
    return domainErr("Only approved loans can have installments marked due.");
  }
  if (lineStatus === "due") {
    return domainErr("This installment is already due.");
  }
  if (lineStatus !== "scheduled") {
    return domainErr("Only scheduled installments can be marked due.");
  }
  return domainOk({ status: "due" });
}

export function markScheduleLinePaid(
  loanStatus: LoanStatus,
  lineStatus: SchedulePaymentStatus
): DomainResult<{ status: "paid" }> {
  if (loanStatus !== "approved") {
    return domainErr("Only approved loans can have installments marked paid.");
  }
  if (lineStatus === "paid") {
    return domainErr("This installment is already marked paid.");
  }
  if (lineStatus === "void") {
    return domainErr("This installment is void and can't be paid.");
  }
  if (!PAYABLE_STATUSES.includes(lineStatus)) {
    return domainErr("This installment can't be marked paid.");
  }
  return domainOk({ status: "paid" });
}
