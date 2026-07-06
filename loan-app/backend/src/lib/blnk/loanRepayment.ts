import type { InstallRow, LoanScheduleRow } from "../../db/index.js";
import {
  postTransactionsSequentially,
  type BlnkTransactionItem,
} from "./bulkTransactions.js";
import { resolveDisbursementBalance } from "./loanDisbursement.js";
import { resolveLoanBalance } from "./resolveLoanBalance.js";
import type { LoanBookType } from "../../db/index.js";

const INTEREST_INCOME_DESTINATION = "@Interest-Income";

function repaymentMetaData(input: {
  repaymentId: string;
  loanId: string;
  loanScheduleId: string;
  period: number;
  repaymentLeg: "interest" | "principal" | "deferred_income";
}): Record<string, string> {
  return {
    managed_by: "loan-app",
    transaction_type: "loan_repayment",
    loan_repayment_id: input.repaymentId,
    loan_id: input.loanId,
    loan_schedule_id: input.loanScheduleId,
    period: String(input.period),
    repayment_leg: input.repaymentLeg,
  };
}

export function buildLoanRepaymentId(loanScheduleId: string): string {
  return loanScheduleId.startsWith("ls_")
    ? `rep_${loanScheduleId.slice(3)}`
    : `rep_${loanScheduleId}`;
}

export function buildLoanRepaymentBulkTransactions(input: {
  repaymentId: string;
  currency: string;
  customerCashBalanceId: string;
  accruedInterestBalanceId: string;
  loansReceivableBalanceId: string;
  deferredFeeBalanceId: string;
  scheduleLine: LoanScheduleRow;
}): BlnkTransactionItem[] {
  const { scheduleLine: line } = input;

  if (line.interest + line.principal !== line.expected_payment) {
    throw new Error("Installment principal and interest do not match expected payment.");
  }

  const transactions: BlnkTransactionItem[] = [
    {
      precise_amount: line.interest,
      currency: input.currency,
      source: input.customerCashBalanceId,
      destination: input.accruedInterestBalanceId,
      reference: `${input.repaymentId}_interest`,
      allow_overdraft: true,
      description: `Loan repayment interest — period ${line.period}`,
      meta_data: repaymentMetaData({
        repaymentId: input.repaymentId,
        loanId: line.loan_id,
        loanScheduleId: line.loan_schedule_id,
        period: line.period,
        repaymentLeg: "interest",
      }),
    },
    {
      precise_amount: line.principal,
      currency: input.currency,
      source: input.customerCashBalanceId,
      destination: input.loansReceivableBalanceId,
      reference: `${input.repaymentId}_principal`,
      allow_overdraft: true,
      description: `Loan repayment principal — period ${line.period}`,
      meta_data: repaymentMetaData({
        repaymentId: input.repaymentId,
        loanId: line.loan_id,
        loanScheduleId: line.loan_schedule_id,
        period: line.period,
        repaymentLeg: "principal",
      }),
    },
  ];

  if (line.fee_income > 0) {
    transactions.push({
      precise_amount: line.fee_income,
      currency: input.currency,
      source: input.deferredFeeBalanceId,
      destination: INTEREST_INCOME_DESTINATION,
      reference: `${input.repaymentId}_deferred-fee`,
      allow_overdraft: true,
      description: `Deferred fee recognition — period ${line.period}`,
      meta_data: repaymentMetaData({
        repaymentId: input.repaymentId,
        loanId: line.loan_id,
        loanScheduleId: line.loan_schedule_id,
        period: line.period,
        repaymentLeg: "deferred_income",
      }),
    });
  }

  return transactions;
}

export async function postLoanRepaymentBulk(
  install: InstallRow,
  input: {
    repaymentId: string;
    identityId: string;
    allowedBooks: LoanBookType[];
    scheduleLine: LoanScheduleRow;
  }
): Promise<{ totalAmountPaid: number }> {
  const customerCash = await resolveDisbursementBalance(
    install,
    input.identityId,
    input.allowedBooks
  );

  const [accruedInterest, loansReceivable, deferredFee] = await Promise.all([
    resolveLoanBalance(
      install,
      input.identityId,
      input.scheduleLine.loan_id,
      "accrued_interest"
    ),
    resolveLoanBalance(
      install,
      input.identityId,
      input.scheduleLine.loan_id,
      "loans_receivable"
    ),
    resolveLoanBalance(
      install,
      input.identityId,
      input.scheduleLine.loan_id,
      "deferred_fee"
    ),
  ]);

  const transactions = buildLoanRepaymentBulkTransactions({
    repaymentId: input.repaymentId,
    currency: customerCash.currency,
    customerCashBalanceId: customerCash.balanceId,
    accruedInterestBalanceId: accruedInterest.balanceId,
    loansReceivableBalanceId: loansReceivable.balanceId,
    deferredFeeBalanceId: deferredFee.balanceId,
    scheduleLine: input.scheduleLine,
  });

  await postTransactionsSequentially(install, transactions);

  return {
    totalAmountPaid: input.scheduleLine.expected_payment,
  };
}
