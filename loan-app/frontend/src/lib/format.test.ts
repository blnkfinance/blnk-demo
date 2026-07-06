import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseMoneyInputToMinor, sanitizeMoneyInput } from "./format";

describe("parseMoneyInputToMinor", () => {
  it("returns null for empty or malformed input", () => {
    assert.equal(parseMoneyInputToMinor(""), null);
    assert.equal(parseMoneyInputToMinor("."), null);
    assert.equal(parseMoneyInputToMinor("abc"), null);
  });

  it("parses zero values", () => {
    assert.equal(parseMoneyInputToMinor("0"), 0);
    assert.equal(parseMoneyInputToMinor("0.00"), 0);
    assert.equal(parseMoneyInputToMinor("0.0"), 0);
  });

  it("parses positive fractional and whole amounts", () => {
    assert.equal(parseMoneyInputToMinor("1.25"), 125);
    assert.equal(parseMoneyInputToMinor("100,000.50"), 10_000_050);
  });

  it("rejects negative-looking input", () => {
    assert.equal(parseMoneyInputToMinor("-5"), null);
    assert.equal(parseMoneyInputToMinor("  -1.25"), null);
  });
});
