import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDateOnly } from "./dates.js";
import { actualDaysBetween, interestForPeriod } from "./day-count.js";

describe("actualDaysBetween", () => {
  it("counts Jan 15 to Feb 15 as 31 days", () => {
    const start = parseDateOnly("2025-01-15")!;
    const end = parseDateOnly("2025-02-15")!;
    assert.equal(actualDaysBetween(start, end), 31);
  });

  it("counts Feb 15 to Mar 15 as 28 days in non-leap year", () => {
    const start = parseDateOnly("2025-02-15")!;
    const end = parseDateOnly("2025-03-15")!;
    assert.equal(actualDaysBetween(start, end), 28);
  });

  it("counts Feb 15 to Mar 15 as 29 days in leap year", () => {
    const start = parseDateOnly("2024-02-15")!;
    const end = parseDateOnly("2024-03-15")!;
    assert.equal(actualDaysBetween(start, end), 29);
  });
});

describe("interestForPeriod", () => {
  it("computes Actual/360 interest", () => {
    const start = parseDateOnly("2025-01-15")!;
    const end = parseDateOnly("2025-02-15")!;
    const interest = interestForPeriod(10_000_000, 2400, start, end, "actual_360");
    // 10M * 0.24 * 31/360 = 206666.67 → 206667
    assert.equal(interest, 206_667);
  });

  it("computes lower Actual/365 interest for same window", () => {
    const start = parseDateOnly("2025-01-15")!;
    const end = parseDateOnly("2025-02-15")!;
    const interest360 = interestForPeriod(10_000_000, 2400, start, end, "actual_360");
    const interest365 = interestForPeriod(10_000_000, 2400, start, end, "actual_365");
    assert.ok(interest365 < interest360);
  });
});
