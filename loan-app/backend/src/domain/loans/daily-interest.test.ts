import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { goldenInput, goldenProduct } from "./fixtures/golden-100k-12mo.js";
import { buildExpectedCashFlow } from "./schedule/index.js";
import { buildScheduleAccrualWindows } from "./schedule/accrual-windows.js";
import { actualDaysBetween } from "./schedule/day-count.js";
import { buildDailyInterestAmounts } from "./daily-interest.js";

describe("buildDailyInterestAmounts", () => {
  const schedule = buildExpectedCashFlow({
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

  const loanTerms = {
    disbursement_date: "2025-01-01",
    first_payment_date: goldenInput.first_payment_date,
    term_periods: goldenInput.term_periods,
    annual_rate_bps: goldenProduct.annual_rate_bps,
    day_count_convention: goldenProduct.day_count_convention,
    payment_frequency: goldenProduct.payment_frequency,
    amortization_type: goldenProduct.amortization_type,
    grace_period_type: goldenProduct.grace_period_type,
    grace_period_days: goldenProduct.grace_period_days,
    principal: goldenInput.principal,
  };

  it("sums daily amounts to line.interest for period 1", () => {
    const line = schedule[0]!;
    const daily = buildDailyInterestAmounts({ loan: loanTerms, line });
    assert.ok(daily.length > 0);
    const sum = daily.reduce((total, entry) => total + entry.amount, 0);
    assert.equal(sum, line.interest);
  });

  it("uses one entry per accrual day", () => {
    const line = schedule[0]!;
    const daily = buildDailyInterestAmounts({ loan: loanTerms, line });
    const windows = buildScheduleAccrualWindows({
      principal: loanTerms.principal,
      term_periods: loanTerms.term_periods,
      first_payment_date: loanTerms.first_payment_date,
      accrual_start_date: loanTerms.disbursement_date,
      annual_rate_bps: loanTerms.annual_rate_bps,
      day_count_convention: loanTerms.day_count_convention,
      payment_frequency: loanTerms.payment_frequency,
      amortization_type: loanTerms.amortization_type,
      grace_period_type: loanTerms.grace_period_type,
      grace_period_days: loanTerms.grace_period_days,
    });
    const window = windows[0]!;
    assert.equal(daily.length, actualDaysBetween(window.start, window.end));
  });

  it("true-ups last day for a later period", () => {
    const line = schedule[7]!;
    const daily = buildDailyInterestAmounts({ loan: loanTerms, line });
    const sum = daily.reduce((total, entry) => total + entry.amount, 0);
    assert.equal(sum, line.interest);
  });

  it("distributes rounding differences without a negative final day", () => {
    const daily = buildDailyInterestAmounts({
      loan: {
        disbursement_date: "2026-01-01",
        first_payment_date: "2026-01-31",
        term_periods: 1,
        annual_rate_bps: 2400,
        day_count_convention: "actual_360",
        payment_frequency: "monthly",
        amortization_type: "bullet",
        grace_period_type: "none",
        grace_period_days: null,
        principal: 900,
      },
      line: {
        period: 1,
        interest: 18,
        principal: 900,
        closing_principal: 0,
      },
    });

    assert.equal(daily.length, 30);
    assert.equal(
      daily.reduce((total, entry) => total + entry.amount, 0),
      18
    );
    assert.ok(daily.every((entry) => entry.amount >= 0));
    assert.ok(
      Math.max(...daily.map((entry) => entry.amount)) -
        Math.min(...daily.map((entry) => entry.amount)) <=
        1
    );
  });
});
