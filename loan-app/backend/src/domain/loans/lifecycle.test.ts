import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { approveLoan, rejectLoan } from "./lifecycle.js";

describe("loan lifecycle", () => {
  it("allows approve from pending_approval", () => {
    const result = approveLoan("pending_approval");
    assert.equal(result.ok, true);
  });

  it("rejects approve from approved", () => {
    const result = approveLoan("approved");
    assert.equal(result.ok, false);
  });

  it("allows reject from pending_approval", () => {
    const result = rejectLoan("pending_approval");
    assert.equal(result.ok, true);
  });

  it("rejects reject from rejected", () => {
    const result = rejectLoan("rejected");
    assert.equal(result.ok, false);
  });
});
