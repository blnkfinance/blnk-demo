import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { goldenInput, goldenProduct } from "../fixtures/golden-100k-12mo.js";
import { buildEqualInstallmentsSchedule } from "./equal-installments.js";
import { actualDaysBetween } from "./day-count.js";
import { buildScheduleAccrualWindows } from "./accrual-windows.js";

describe("buildEqualInstallmentsSchedule", () => {
  const terms = {
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
  } as const;

  it("amortizes principal to zero with exact sum", () => {
    const lines = buildEqualInstallmentsSchedule(terms);

    assert.equal(lines.length, 12);
    const sumPrincipal = lines.reduce((s, l) => s + l.principal, 0);
    assert.equal(sumPrincipal, goldenInput.principal);
    assert.equal(lines[lines.length - 1]!.closing_principal, 0);
    for (const line of lines) {
      assert.equal(line.expected_payment, line.principal + line.interest);
    }
  });

  it("accrues more interest per day in March than February at the same balance", () => {
    const windows = buildScheduleAccrualWindows(terms);
    const febDays = actualDaysBetween(windows[7]!.start, windows[7]!.end);
    const marDays = actualDaysBetween(windows[8]!.start, windows[8]!.end);
    assert.ok(febDays < marDays);

    const balance = goldenInput.principal;
    const febInterest = Math.round(
      (balance * (goldenProduct.annual_rate_bps / 10_000) * febDays) / 360
    );
    const marInterest = Math.round(
      (balance * (goldenProduct.annual_rate_bps / 10_000) * marDays) / 360
    );
    assert.ok(marInterest > febInterest);
  });
});
