import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLoanRepaymentBulkTransactions,
  buildLoanRepaymentId,
} from "./loanRepayment.js";

describe("buildLoanRepaymentBulkTransactions", () => {
  const scheduleLine = {
    loan_schedule_id: "ls_1",
    loan_id: "loan_1",
    period: 1,
    payment_date: "2025-07-30",
    principal: 800_000,
    interest: 200_000,
    expected_payment: 1_000_000,
    closing_principal: 9_200_000,
    carrying_amount: 0,
    eir_interest: 0,
    fee_income: 50_000,
    interest_blnk_transaction: null,
    status: "scheduled" as const,
  };

  it("creates separate interest and principal transactions", () => {
    const txs = buildLoanRepaymentBulkTransactions({
      repaymentId: "rep_1",
      currency: "MXN",
      customerCashBalanceId: "bln_cash",
      accruedInterestBalanceId: "bln_accrued",
      loansReceivableBalanceId: "bln_receivable",
      deferredFeeBalanceId: "bln_deferred",
      scheduleLine,
    });

    assert.equal(txs.length, 3);
    assert.equal(txs[0]!.precise_amount, 200_000);
    assert.equal(txs[0]!.source, "bln_cash");
    assert.equal(txs[0]!.destination, "bln_accrued");
    assert.equal(txs[1]!.precise_amount, 800_000);
    assert.equal(txs[1]!.source, "bln_cash");
    assert.equal(txs[1]!.destination, "bln_receivable");
    assert.equal(txs[2]!.precise_amount, 50_000);
    assert.equal(txs[2]!.source, "bln_deferred");
    assert.equal(txs[2]!.destination, "@Interest-Income");
    for (const tx of txs) {
      const meta = tx.meta_data as Record<string, string>;
      assert.equal(meta.transaction_type, "loan_repayment");
      assert.equal(meta.loan_repayment_id, "rep_1");
    }
  });

  it("omits deferred income leg when fee_income is zero", () => {
    const txs = buildLoanRepaymentBulkTransactions({
      repaymentId: "rep_1",
      currency: "MXN",
      customerCashBalanceId: "bln_cash",
      accruedInterestBalanceId: "bln_accrued",
      loansReceivableBalanceId: "bln_receivable",
      deferredFeeBalanceId: "bln_deferred",
      scheduleLine: { ...scheduleLine, fee_income: 0 },
    });

    assert.equal(txs.length, 2);
  });

  it("uses deterministic repayment-and-leg references", () => {
    const txs = buildLoanRepaymentBulkTransactions({
      repaymentId: "rep_1",
      currency: "MXN",
      customerCashBalanceId: "bln_cash",
      accruedInterestBalanceId: "bln_accrued",
      loansReceivableBalanceId: "bln_receivable",
      deferredFeeBalanceId: "bln_deferred",
      scheduleLine,
    });

    assert.deepEqual(
      txs.map((tx) => tx.reference),
      ["rep_1_interest", "rep_1_principal", "rep_1_deferred-fee"]
    );
  });

  it("derives a stable repayment ID from the schedule ID", () => {
    assert.equal(buildLoanRepaymentId("ls_abc-123"), "rep_abc-123");
    assert.equal(buildLoanRepaymentId("ls_abc-123"), "rep_abc-123");
  });
});
