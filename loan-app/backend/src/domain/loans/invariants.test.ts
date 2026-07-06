import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  goldenInput,
  goldenNow,
  goldenProduct,
} from "./fixtures/golden-100k-12mo.js";
import { validateCreateLoanInput } from "./invariants.js";

describe("validateCreateLoanInput", () => {
  it("accepts valid input", () => {
    const result = validateCreateLoanInput(goldenProduct, goldenInput, goldenNow);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.net_disbursement, 9_800_000);
    }
  });

  it("rejects archived product", () => {
    const result = validateCreateLoanInput(
      { ...goldenProduct, status: "archived" },
      goldenInput,
      goldenNow
    );
    assert.equal(result.ok, false);
  });

  it("rejects origination fee >= principal", () => {
    const result = validateCreateLoanInput(
      goldenProduct,
      { ...goldenInput, origination_fee: goldenInput.principal },
      goldenNow
    );
    assert.equal(result.ok, false);
  });

  it("rejects first payment date more than one year ago", () => {
    const result = validateCreateLoanInput(
      goldenProduct,
      { ...goldenInput, first_payment_date: "2023-12-31" },
      goldenNow
    );
    assert.equal(result.ok, false);
  });

  it("rejects missing customer identity", () => {
    const result = validateCreateLoanInput(
      goldenProduct,
      { ...goldenInput, blnk_identity_id: "  " },
      goldenNow
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, "Choose a customer.");
    }
  });
});
