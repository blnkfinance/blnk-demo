import type { InstallRow, LoanRepaymentLineRow, LoanRow } from "../../db/index.js";
import { fetchLoanBalanceSnapshot } from "./resolveLoanBalance.js";

export type LoanBalanceBreakdown = {
  remaining_principal: number;
  accrued_interest: number;
  total_repaid: number;
  currency: string;
  loans_receivable_balance_id: string;
  accrued_interest_balance_id: string;
};

export function remainingPrincipalFromSnapshot(balance: number): number {
  return Math.abs(balance);
}

export function accruedInterestFromSnapshot(
  balance: number,
  debitBalance: number,
  creditBalance: number
): number {
  const fromBalance = Math.abs(balance);
  if (fromBalance > 0) {
    return fromBalance;
  }
  // Accruals debit accrued_interest; list rows may omit `balance` but include legs.
  return Math.max(0, debitBalance - creditBalance);
}

export function totalRepaidFromRepayments(repayments: LoanRepaymentLineRow[]): number {
  return repayments.reduce((sum, repayment) => sum + repayment.total_amount_paid, 0);
}

export async function buildLoanBalanceBreakdown(
  install: InstallRow,
  loan: Pick<LoanRow, "loan_id" | "status" | "blnk_identity_id">,
  repayments: LoanRepaymentLineRow[]
): Promise<LoanBalanceBreakdown | null> {
  if (loan.status !== "approved" || !loan.blnk_identity_id) {
    return null;
  }

  const [receivable, accruedInterest] = await Promise.all([
    fetchLoanBalanceSnapshot(
      install,
      loan.blnk_identity_id,
      loan.loan_id,
      "loans_receivable"
    ),
    fetchLoanBalanceSnapshot(
      install,
      loan.blnk_identity_id,
      loan.loan_id,
      "accrued_interest"
    ),
  ]);

  return {
    remaining_principal: remainingPrincipalFromSnapshot(receivable.balance),
    accrued_interest: accruedInterestFromSnapshot(
      accruedInterest.balance,
      accruedInterest.debitBalance,
      accruedInterest.creditBalance
    ),
    total_repaid: totalRepaidFromRepayments(repayments),
    currency: receivable.currency,
    loans_receivable_balance_id: receivable.balanceId,
    accrued_interest_balance_id: accruedInterest.balanceId,
  };
}
