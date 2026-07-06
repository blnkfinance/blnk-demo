import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildInterestAccrualBulkTransactions } from "./loanInterestAccrual.js";

describe("buildInterestAccrualBulkTransactions", () => {
  it("uses stable schedule-and-date references", () => {
    const transactions = buildInterestAccrualBulkTransactions({
      accruedInterestBalanceId: "bln_accrued_interest",
      currency: "MXN",
      loanId: "loan_1",
      scheduleLine: {
        loan_schedule_id: "ls_period_1",
        period: 1,
      },
      dailyAmounts: [
        { accrual_date: "2026-01-01", amount: 100 },
        { accrual_date: "2026-01-02", amount: 100 },
        { accrual_date: "2026-01-03", amount: 101 },
      ],
    });

    assert.deepEqual(
      transactions.map((transaction) => transaction.reference),
      [
        "ls_period_1_2026-01-01",
        "ls_period_1_2026-01-02",
        "ls_period_1_2026-01-03",
      ]
    );
    for (const transaction of transactions) {
      const meta = transaction.meta_data as Record<string, string>;
      assert.equal(meta.transaction_type, "interest_accrual");
      assert.equal(meta.loan_schedule_id, "ls_period_1");
    }
  });

  it("produces the same references when the period is rebuilt", () => {
    const input = {
      accruedInterestBalanceId: "bln_accrued_interest",
      currency: "MXN",
      loanId: "loan_1",
      scheduleLine: {
        loan_schedule_id: "ls_period_1",
        period: 1,
      },
      dailyAmounts: [
        { accrual_date: "2026-01-01", amount: 100 },
        { accrual_date: "2026-01-02", amount: 101 },
      ],
    };

    const first = buildInterestAccrualBulkTransactions(input);
    const replay = buildInterestAccrualBulkTransactions(input);

    assert.deepEqual(
      replay.map((transaction) => transaction.reference),
      first.map((transaction) => transaction.reference)
    );
  });
});
