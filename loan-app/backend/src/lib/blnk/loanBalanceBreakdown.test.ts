import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accruedInterestFromSnapshot,
  remainingPrincipalFromSnapshot,
  totalRepaidFromRepayments,
} from "./loanBalanceBreakdown.js";

describe("loanBalanceBreakdown", () => {
  it("uses abs(balance) for remaining principal", () => {
    assert.equal(remainingPrincipalFromSnapshot(-1_000_000), 1_000_000);
    assert.equal(remainingPrincipalFromSnapshot(850_000), 850_000);
  });

  it("uses abs(balance) for accrued interest when balance is set", () => {
    assert.equal(accruedInterestFromSnapshot(-12_345, 0, 0), 12_345);
    assert.equal(accruedInterestFromSnapshot(12_345, 0, 0), 12_345);
  });

  it("uses debit minus credit for accrued interest when balance is omitted", () => {
    assert.equal(accruedInterestFromSnapshot(0, 50_000, 10_000), 40_000);
    assert.equal(accruedInterestFromSnapshot(0, 0, 0), 0);
  });

  it("sums repayment totals", () => {
    assert.equal(
      totalRepaidFromRepayments([
        {
          loan_repayment_id: "rep_1",
          loan_id: "loan_1",
          loan_schedule_id: "ls_1",
          total_amount_paid: 10_000,
          created_at: "2025-01-01T00:00:00.000Z",
          period: 1,
          payment_date: "2025-02-01",
          principal: 8_000,
          interest: 2_000,
          expected_payment: 10_000,
        },
        {
          loan_repayment_id: "rep_2",
          loan_id: "loan_1",
          loan_schedule_id: "ls_2",
          total_amount_paid: 10_500,
          created_at: "2025-02-01T00:00:00.000Z",
          period: 2,
          payment_date: "2025-03-01",
          principal: 8_100,
          interest: 2_400,
          expected_payment: 10_500,
        },
      ]),
      20_500
    );
  });
});
