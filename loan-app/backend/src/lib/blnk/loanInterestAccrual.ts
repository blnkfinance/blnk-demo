import type { InstallRow, LoanScheduleRow } from "../../db/index.js";
import type { DailyInterestEntry } from "../../domain/loans/daily-interest.js";
import {
  postTransactionsSequentially,
  type BlnkTransactionItem,
} from "./bulkTransactions.js";
import { resolveLoanBalance } from "./resolveLoanBalance.js";

const INTEREST_INCOME_DESTINATION = "@Interest-Income";

function baseMetaData(
  loanId: string,
  loanScheduleId: string,
  period: number
): Record<string, string> {
  return {
    managed_by: "loan-app",
    transaction_type: "interest_accrual",
    loan_id: loanId,
    loan_schedule_id: loanScheduleId,
    period: String(period),
  };
}

export function buildInterestAccrualBulkTransactions(input: {
  accruedInterestBalanceId: string;
  currency: string;
  loanId: string;
  scheduleLine: Pick<LoanScheduleRow, "loan_schedule_id" | "period">;
  dailyAmounts: DailyInterestEntry[];
}): BlnkTransactionItem[] {
  const { scheduleLine } = input;

  return input.dailyAmounts.map((entry) => ({
    precise_amount: entry.amount,
    currency: input.currency,
    source: input.accruedInterestBalanceId,
    destination: INTEREST_INCOME_DESTINATION,
    reference: `${scheduleLine.loan_schedule_id}_${entry.accrual_date}`,
    allow_overdraft: true,
    description: `Daily interest — period ${scheduleLine.period}`,
    meta_data: {
      ...baseMetaData(input.loanId, scheduleLine.loan_schedule_id, scheduleLine.period),
      accrual_date: entry.accrual_date,
    },
  }));
}

export async function simulateInterestAccrualForScheduleLine(
  install: InstallRow,
  input: {
    identityId: string;
    loanId: string;
    scheduleLine: LoanScheduleRow;
    dailyAmounts: DailyInterestEntry[];
  }
): Promise<{ transactionCount: number; totalInterest: number }> {
  const { balanceId, currency } = await resolveLoanBalance(
    install,
    input.identityId,
    input.loanId,
    "accrued_interest"
  );

  const transactions = buildInterestAccrualBulkTransactions({
    accruedInterestBalanceId: balanceId,
    currency,
    loanId: input.loanId,
    scheduleLine: input.scheduleLine,
    dailyAmounts: input.dailyAmounts,
  });

  if (transactions.length === 0) {
    throw new Error("No interest to accrue for this period.");
  }

  if (transactions.length > 10_000) {
    throw new Error("Accrual period exceeds the maximum number of daily transactions.");
  }

  const result = await postTransactionsSequentially(install, transactions);
  const totalInterest = input.dailyAmounts.reduce((sum, entry) => sum + entry.amount, 0);

  return {
    transactionCount: result.transactionCount,
    totalInterest,
  };
}
