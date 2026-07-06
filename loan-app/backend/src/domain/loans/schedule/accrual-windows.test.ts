import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { goldenInput, goldenProduct } from "../fixtures/golden-100k-12mo.js";
import { buildAccrualWindows, buildScheduleAccrualWindows } from "./accrual-windows.js";
import { actualDaysBetween } from "./day-count.js";

describe("buildAccrualWindows", () => {
  it("starts period 1 at accrual start date", () => {
    const paymentDates = ["2025-07-30", "2025-08-30"];
    const windows = buildAccrualWindows("2025-01-01", paymentDates);
    assert.equal(windows.length, 2);
    assert.equal(windows[0]!.start.toISOString().slice(0, 10), "2025-01-01");
    assert.equal(windows[0]!.end.toISOString().slice(0, 10), "2025-07-30");
    assert.equal(windows[1]!.start.toISOString().slice(0, 10), "2025-07-30");
  });

  it("builds windows from schedule terms", () => {
    const windows = buildScheduleAccrualWindows({
      principal: goldenInput.principal,
      term_periods: goldenInput.term_periods,
      first_payment_date: goldenInput.first_payment_date,
      annual_rate_bps: goldenProduct.annual_rate_bps,
      day_count_convention: goldenProduct.day_count_convention,
      accrual_start_date: "2025-01-01",
      payment_frequency: goldenProduct.payment_frequency,
      amortization_type: goldenProduct.amortization_type,
      grace_period_type: goldenProduct.grace_period_type,
      grace_period_days: goldenProduct.grace_period_days,
    });
    assert.equal(windows.length, 12);
    const febWindow = windows[7]!;
    const marWindow = windows[8]!;
    assert.ok(
      actualDaysBetween(febWindow.start, febWindow.end) <
        actualDaysBetween(marWindow.start, marWindow.end)
    );
  });
});
