import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLoanDraft } from "./compose.js";
import {
  goldenExpected,
  goldenInput,
  goldenNow,
  goldenProduct,
} from "./fixtures/golden-100k-12mo.js";
import { computeOpeningCarryingAmount } from "./carrying.js";
import {
  actualDayCountPresentValueResidual,
  computeEffectiveAnnualRateBps,
} from "./eir.js";
import { buildExpectedCashFlow } from "./schedule/index.js";

describe("computeEffectiveAnnualRateBps", () => {
  it("returns EIR above contract rate when origination fee is withheld", () => {
    const schedule = buildExpectedCashFlow({
      principal: goldenInput.principal,
      term_periods: goldenInput.term_periods,
      first_payment_date: goldenInput.first_payment_date,
      accrual_start_date: "2025-06-01",
      annual_rate_bps: goldenProduct.annual_rate_bps,
      day_count_convention: goldenProduct.day_count_convention,
      payment_frequency: goldenProduct.payment_frequency,
      amortization_type: goldenProduct.amortization_type,
      grace_period_type: goldenProduct.grace_period_type,
      grace_period_days: goldenProduct.grace_period_days,
    });
    const opening = computeOpeningCarryingAmount({
      net_disbursement: goldenInput.principal - goldenInput.origination_fee,
    });
    const eir = computeEffectiveAnnualRateBps({
      opening_carrying_amount: opening,
      schedule,
      payment_frequency: goldenProduct.payment_frequency,
      day_count_convention: goldenProduct.day_count_convention,
      accrual_start_date: "2025-06-01",
    });
    assert.ok(eir > goldenProduct.annual_rate_bps);
    assert.equal(eir, goldenExpected.effective_annual_rate_bps);
  });

  it("solves an Actual/360 EIR above 100%", () => {
    const highFeeInput = {
      ...goldenInput,
      origination_fee: goldenInput.principal / 2,
    };
    const result = createLoanDraft(goldenProduct, highFeeInput, goldenNow);
    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.ok(result.value.loan.effective_annual_rate_bps > 10_000);
    const residual = actualDayCountPresentValueResidual(
      result.value.loan.net_disbursement,
      result.value.schedule,
      "2025-06-01",
      result.value.loan.effective_annual_rate_bps,
      goldenProduct.day_count_convention
    );
    assert.ok(Math.abs(residual) < 250);
  });

  it("solves a 30/360 EIR above 100%", () => {
    const result = createLoanDraft(
      { ...goldenProduct, day_count_convention: "30_360" },
      { ...goldenInput, origination_fee: goldenInput.principal / 2 },
      goldenNow
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.ok(result.value.loan.effective_annual_rate_bps > 10_000);
    const last = result.value.schedule.at(-1)!;
    assert.equal(
      last.carrying_amount + last.eir_interest - last.expected_payment,
      0
    );
  });
});

describe("actual-day EIR roll-forward", () => {
  it("closes the present-value equation at the solved rate", () => {
    const result = createLoanDraft(goldenProduct, goldenInput, goldenNow);
    assert.equal(result.ok, true);
    if (!result.ok) return;

    const { loan, schedule } = result.value;
    const residual = actualDayCountPresentValueResidual(
      loan.net_disbursement,
      schedule,
      "2025-06-01",
      loan.effective_annual_rate_bps,
      goldenProduct.day_count_convention
    );
    assert.ok(Math.abs(residual) < 250);
  });

  it("does not produce pathological negative final-period fee income on golden loan", () => {
    const result = createLoanDraft(goldenProduct, goldenInput, goldenNow);
    assert.equal(result.ok, true);
    if (!result.ok) return;

    const { loan, schedule } = result.value;
    const last = schedule[schedule.length - 1]!;

    assert.ok(last.eir_interest > 0);
    assert.ok(last.fee_income >= 0);
    assert.equal(
      schedule.reduce((sum, line) => sum + line.fee_income, 0),
      loan.origination_fee
    );

    for (let i = 0; i < schedule.length - 1; i++) {
      const line = schedule[i]!;
      const next = schedule[i + 1]!;
      const impliedNext =
        line.carrying_amount + line.eir_interest - line.expected_payment;
      assert.equal(impliedNext, next.carrying_amount);
    }
  });
});

describe("zero-fee EIR invariant", () => {
  it("uses contract rate and eir_interest equals interest on non-last periods", () => {
    const result = createLoanDraft(
      goldenProduct,
      { ...goldenInput, origination_fee: 0 },
      goldenNow
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;

    const { loan, schedule } = result.value;
    assert.equal(loan.effective_annual_rate_bps, goldenProduct.annual_rate_bps);

    for (const line of schedule) {
      assert.equal(line.fee_income, 0);
      assert.equal(line.eir_interest, line.interest + line.fee_income);
    }

    for (let i = 0; i < schedule.length - 1; i++) {
      assert.equal(schedule[i]!.eir_interest, schedule[i]!.interest);
      const nextCarrying =
        schedule[i]!.carrying_amount +
        schedule[i]!.eir_interest -
        schedule[i]!.expected_payment;
      assert.equal(nextCarrying, schedule[i + 1]!.carrying_amount);
    }

    const last = schedule[schedule.length - 1]!;
    assert.equal(
      last.carrying_amount + last.eir_interest - last.expected_payment,
      0
    );
  });
});
