import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { advancePaymentDate, computeMaturityDate } from "./maturity.js";

describe("maturity", () => {
  it("computes maturity for 12 monthly payments from July 30", () => {
    const maturity = computeMaturityDate("2025-07-30", 12, "monthly");
    assert.equal(maturity, "2026-06-30");
  });

  it("preserves end-of-month when advancing monthly", () => {
    const first = new Date("2025-01-31T00:00:00.000Z");
    const second = advancePaymentDate(first, 2, "monthly");
    assert.equal(second.toISOString().slice(0, 10), "2025-02-28");
  });
});
