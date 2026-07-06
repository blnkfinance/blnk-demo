import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { finalizeApprovedLoan } from "./compose.js";
import {
  goldenInput,
  goldenNow,
  goldenProduct,
} from "./fixtures/golden-100k-12mo.js";
import { createLoanDraft } from "./compose.js";
import { actualDaysBetween } from "./schedule/day-count.js";
import { buildScheduleAccrualWindows } from "./schedule/accrual-windows.js";

describe("finalizeApprovedLoan", () => {
  it("recomputes period 1 interest using disbursement date", () => {
    const draft = createLoanDraft(goldenProduct, goldenInput, goldenNow);
    assert.equal(draft.ok, true);
    if (!draft.ok) return;

    const pendingFirstInterest = draft.value.schedule[0]!.interest;

    const finalized = finalizeApprovedLoan(
      {
        principal: goldenInput.principal,
        origination_fee: goldenInput.origination_fee,
        term_periods: goldenInput.term_periods,
        first_payment_date: goldenInput.first_payment_date,
        annual_rate_bps: goldenProduct.annual_rate_bps,
        day_count_convention: goldenProduct.day_count_convention,
        payment_frequency: goldenProduct.payment_frequency,
        amortization_type: goldenProduct.amortization_type,
        grace_period_type: goldenProduct.grace_period_type,
        grace_period_days: goldenProduct.grace_period_days,
        maturity_date: goldenExpectedMaturity(),
      },
      "2025-06-15"
    );
    assert.equal(finalized.ok, true);
    if (!finalized.ok) return;

    assert.ok(finalized.value.schedule[0]!.interest < pendingFirstInterest);
    assert.equal(finalized.value.disbursement_date, "2025-06-15");
  });

  it("rejects approval when first payment is before disbursement date", () => {
    const result = finalizeApprovedLoan(
      {
        principal: goldenInput.principal,
        origination_fee: goldenInput.origination_fee,
        term_periods: goldenInput.term_periods,
        first_payment_date: "2025-06-01",
        annual_rate_bps: goldenProduct.annual_rate_bps,
        day_count_convention: goldenProduct.day_count_convention,
        payment_frequency: goldenProduct.payment_frequency,
        amortization_type: goldenProduct.amortization_type,
        grace_period_type: goldenProduct.grace_period_type,
        grace_period_days: goldenProduct.grace_period_days,
        maturity_date: "2026-05-01",
      },
      "2025-06-15"
    );
    assert.equal(result.ok, false);
  });
});

describe("actual day count schedule", () => {
  it("accrues less interest in February than March for equal balance", () => {
    const windows = buildScheduleAccrualWindows({
      principal: goldenInput.principal,
      term_periods: goldenInput.term_periods,
      first_payment_date: goldenInput.first_payment_date,
      accrual_start_date: "2025-01-01",
      annual_rate_bps: goldenProduct.annual_rate_bps,
      day_count_convention: goldenProduct.day_count_convention,
      payment_frequency: goldenProduct.payment_frequency,
      amortization_type: goldenProduct.amortization_type,
      grace_period_type: goldenProduct.grace_period_type,
      grace_period_days: goldenProduct.grace_period_days,
    });

    const febDays = actualDaysBetween(windows[7]!.start, windows[7]!.end);
    const marDays = actualDaysBetween(windows[8]!.start, windows[8]!.end);
    assert.ok(febDays < marDays);
  });
});

function goldenExpectedMaturity(): string {
  return "2026-06-30";
}
