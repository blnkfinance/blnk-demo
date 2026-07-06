import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_TERM_PERIODS,
} from "./limits.js";
import {
  goldenInput,
  goldenNow,
  goldenProduct,
} from "./fixtures/golden-100k-12mo.js";
import { createLoanDraft } from "./compose.js";
import { validateCreateLoanInput } from "./invariants.js";

describe("loan input limits", () => {
  it("accepts the maximum term length", () => {
    const result = validateCreateLoanInput(
      goldenProduct,
      { ...goldenInput, term_periods: MAX_TERM_PERIODS },
      goldenNow
    );
    assert.equal(result.ok, true);
  });

  it("rejects term length above the maximum", () => {
    const result = validateCreateLoanInput(
      goldenProduct,
      { ...goldenInput, term_periods: MAX_TERM_PERIODS + 1 },
      goldenNow
    );
    assert.equal(result.ok, false);
  });

  it("rejects a first payment date more than five years in the future", () => {
    const result = validateCreateLoanInput(
      goldenProduct,
      { ...goldenInput, first_payment_date: "2031-07-30" },
      goldenNow
    );
    assert.equal(result.ok, false);
  });

  it("rejects schedules with negative principal portions", () => {
    const result = createLoanDraft(
      goldenProduct,
      goldenInput,
      new Date("2025-01-01T00:00:00.000Z")
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /negative principal/i);
    }
  });
});
