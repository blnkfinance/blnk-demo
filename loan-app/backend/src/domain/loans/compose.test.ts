import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  goldenExpected,
  goldenInput,
  goldenNow,
  goldenProduct,
} from "./fixtures/golden-100k-12mo.js";
import { createLoanDraft } from "./compose.js";

describe("createLoanDraft", () => {
  it("matches golden fixture", () => {
    const result = createLoanDraft(goldenProduct, goldenInput, goldenNow);
    assert.equal(result.ok, true);
    if (!result.ok) return;

    const { loan, schedule } = result.value;
    assert.equal(loan.maturity_date, goldenExpected.maturity_date);
    assert.equal(loan.effective_annual_rate_bps, goldenExpected.effective_annual_rate_bps);
    assert.equal(loan.net_disbursement, goldenExpected.net_disbursement);
    assert.equal(loan.status, "pending_approval");
    assert.equal(schedule.length, 12);
  });
});
