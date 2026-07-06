import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  goldenExpected,
  goldenInput,
  goldenNow,
  goldenProduct,
} from "./fixtures/golden-100k-12mo.js";
import { createLoanDraft } from "./compose.js";

describe("applyEirAmortization via createLoanDraft", () => {
  it("satisfies fee income and carrying invariants", () => {
    const result = createLoanDraft(goldenProduct, goldenInput, goldenNow);
    assert.equal(result.ok, true);
    if (!result.ok) return;

    const { loan, schedule } = result.value;
    assert.equal(schedule[0]!.carrying_amount, loan.net_disbursement);

    const feeSum = schedule.reduce((s, l) => s + l.fee_income, 0);
    assert.equal(feeSum, loan.origination_fee);

    for (const line of schedule) {
      assert.equal(line.eir_interest, line.interest + line.fee_income);
    }

    const last = schedule[schedule.length - 1]!;
    const finalCarrying =
      last.carrying_amount + last.eir_interest - last.expected_payment;
    assert.equal(finalCarrying, 0);

    for (const line of schedule) {
      assert.equal(line.status, "scheduled");
    }

    assert.deepEqual(
      schedule.map(({ period, payment_date, principal, interest, expected_payment, closing_principal, carrying_amount, eir_interest, fee_income }) => ({
        period,
        payment_date,
        principal,
        interest,
        expected_payment,
        closing_principal,
        carrying_amount,
        eir_interest,
        fee_income,
      })),
      goldenExpected.schedule
    );
  });
});
