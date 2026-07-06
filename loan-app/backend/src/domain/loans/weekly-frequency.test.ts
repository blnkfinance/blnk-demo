import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLoanDraft } from "./compose.js";
import { buildDailyInterestAmounts } from "./daily-interest.js";
import { goldenInput, goldenProduct } from "./fixtures/golden-100k-12mo.js";
import { advancePaymentDate, computeMaturityDate } from "./maturity.js";
import { buildScheduleAccrualWindows } from "./schedule/accrual-windows.js";
import { actualDaysBetween } from "./schedule/day-count.js";
import { formatDateOnly } from "./schedule/dates.js";
import { buildEqualInstallmentsSchedule } from "./schedule/equal-installments.js";
import { buildInterestAccrualBulkTransactions } from "../../lib/blnk/loanInterestAccrual.js";

const weeklyProduct = {
  ...goldenProduct,
  payment_frequency: "weekly" as const,
};

const weeklyTerms = {
  principal: 1_000_000,
  term_periods: 52,
  first_payment_date: "2025-01-08",
  accrual_start_date: "2025-01-01",
  annual_rate_bps: goldenProduct.annual_rate_bps,
  day_count_convention: goldenProduct.day_count_convention,
  payment_frequency: "weekly" as const,
  amortization_type: goldenProduct.amortization_type,
  grace_period_type: goldenProduct.grace_period_type,
  grace_period_days: goldenProduct.grace_period_days,
};

describe("weekly payment frequency", () => {
  it("advances payment dates by seven days", () => {
    const first = new Date("2025-01-08T00:00:00.000Z");
    const second = advancePaymentDate(first, 2, "weekly");
    const third = advancePaymentDate(first, 3, "weekly");

    assert.equal(formatDateOnly(second), "2025-01-15");
    assert.equal(formatDateOnly(third), "2025-01-22");
  });

  it("computes maturity as the 52nd weekly due date", () => {
    const maturity = computeMaturityDate("2025-01-08", 52, "weekly");
    const first = new Date("2025-01-08T00:00:00.000Z");
    const expected = formatDateOnly(advancePaymentDate(first, 52, "weekly"));
    assert.equal(maturity, expected);
    assert.equal(maturity, "2025-12-31");
  });

  it("builds a weekly equal-installments schedule that amortizes to zero", () => {
    const lines = buildEqualInstallmentsSchedule(weeklyTerms);

    assert.equal(lines.length, 52);
    assert.equal(
      lines.reduce((sum, line) => sum + line.principal, 0),
      weeklyTerms.principal
    );
    assert.equal(lines.at(-1)!.closing_principal, 0);

    for (const line of lines) {
      assert.equal(line.expected_payment, line.principal + line.interest);
    }

    assert.equal(lines[0]!.payment_date, "2025-01-08");
    assert.equal(lines[1]!.payment_date, "2025-01-15");
    assert.equal(lines[51]!.payment_date, "2025-12-31");
  });

  it("uses seven-day accrual windows after period one", () => {
    const windows = buildScheduleAccrualWindows(weeklyTerms);

    assert.equal(windows.length, 52);
    assert.equal(actualDaysBetween(windows[0]!.start, windows[0]!.end), 7);
    assert.equal(actualDaysBetween(windows[1]!.start, windows[1]!.end), 7);
    assert.equal(actualDaysBetween(windows[51]!.start, windows[51]!.end), 7);
  });

  it("sums daily interest to each period's contractual interest", () => {
    const lines = buildEqualInstallmentsSchedule(weeklyTerms);
    const loanTerms = {
      disbursement_date: weeklyTerms.accrual_start_date,
      first_payment_date: weeklyTerms.first_payment_date,
      term_periods: weeklyTerms.term_periods,
      annual_rate_bps: weeklyTerms.annual_rate_bps,
      day_count_convention: weeklyTerms.day_count_convention,
      payment_frequency: weeklyTerms.payment_frequency,
      amortization_type: weeklyTerms.amortization_type,
      grace_period_type: weeklyTerms.grace_period_type,
      grace_period_days: weeklyTerms.grace_period_days,
      principal: weeklyTerms.principal,
    };

    for (const line of [lines[0]!, lines[1]!, lines[25]!, lines[51]!]) {
      const daily = buildDailyInterestAmounts({ loan: loanTerms, line });
      const sum = daily.reduce((total, entry) => total + entry.amount, 0);
      assert.equal(sum, line.interest, `period ${line.period} interest mismatch`);
      assert.equal(daily.length, 7, `period ${line.period} day count mismatch`);
      assert.ok(daily.every((entry) => entry.amount >= 0));
    }
  });

  it("builds one bulk accrual transaction per day with stable references", () => {
    const line = buildEqualInstallmentsSchedule(weeklyTerms)[1]!;
    const daily = buildDailyInterestAmounts({
      loan: {
        disbursement_date: weeklyTerms.accrual_start_date,
        first_payment_date: weeklyTerms.first_payment_date,
        term_periods: weeklyTerms.term_periods,
        annual_rate_bps: weeklyTerms.annual_rate_bps,
        day_count_convention: weeklyTerms.day_count_convention,
        payment_frequency: weeklyTerms.payment_frequency,
        amortization_type: weeklyTerms.amortization_type,
        grace_period_type: weeklyTerms.grace_period_type,
        grace_period_days: weeklyTerms.grace_period_days,
        principal: weeklyTerms.principal,
      },
      line: {
        period: line.period,
        interest: line.interest,
        principal: line.principal,
        closing_principal: line.closing_principal,
      },
    });

    const transactions = buildInterestAccrualBulkTransactions({
      accruedInterestBalanceId: "bln_accrued_interest",
      currency: "MXN",
      loanId: "loan_weekly",
      scheduleLine: {
        loan_schedule_id: "ls_period_2",
        period: line.period,
      },
      dailyAmounts: daily,
    });

    assert.equal(transactions.length, 7);
    assert.deepEqual(
      transactions.map((transaction) => transaction.reference),
      daily.map((entry) => `ls_period_2_${entry.accrual_date}`)
    );
    assert.equal(
      transactions.reduce(
        (sum, transaction) => sum + Number(transaction.precise_amount),
        0
      ),
      line.interest
    );
  });

  it("creates a full loan draft with weekly product settings", () => {
    const result = createLoanDraft(
      weeklyProduct,
      {
        ...goldenInput,
        principal: weeklyTerms.principal,
        term_periods: 52,
        first_payment_date: weeklyTerms.first_payment_date,
      },
      new Date("2025-01-01T00:00:00.000Z")
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.loan.payment_frequency, "weekly");
    assert.equal(result.value.schedule.length, 52);
    assert.equal(result.value.loan.maturity_date, "2025-12-31");
    assert.equal(
      result.value.schedule.reduce((sum, line) => sum + line.principal, 0),
      weeklyTerms.principal
    );

    for (const line of result.value.schedule) {
      const daily = buildDailyInterestAmounts({
        loan: {
          disbursement_date: "2025-01-01",
          first_payment_date: result.value.loan.first_payment_date,
          term_periods: result.value.loan.term_periods,
          annual_rate_bps: result.value.loan.annual_rate_bps,
          day_count_convention: result.value.loan.day_count_convention,
          payment_frequency: result.value.loan.payment_frequency,
          amortization_type: result.value.loan.amortization_type,
          grace_period_type: result.value.loan.grace_period_type,
          grace_period_days: result.value.loan.grace_period_days,
          principal: result.value.loan.principal,
        },
        line: {
          period: line.period,
          interest: line.interest,
          principal: line.principal,
          closing_principal: line.closing_principal,
        },
      });
      assert.equal(
        daily.reduce((sum, entry) => sum + entry.amount, 0),
        line.interest,
        `draft period ${line.period}`
      );
    }
  });
});
