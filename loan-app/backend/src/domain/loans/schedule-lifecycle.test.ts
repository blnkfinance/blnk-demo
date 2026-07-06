import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { markScheduleLineDue, markScheduleLinePaid } from "./schedule-lifecycle.js";

describe("markScheduleLineDue", () => {
  it("allows marking a scheduled line due on an approved loan", () => {
    const result = markScheduleLineDue("approved", "scheduled");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.status, "due");
  });

  it("rejects when the line is already due", () => {
    const result = markScheduleLineDue("approved", "due");
    assert.equal(result.ok, false);
  });

  it("rejects when the loan is not approved", () => {
    const result = markScheduleLineDue("pending_approval", "scheduled");
    assert.equal(result.ok, false);
  });
});

describe("markScheduleLinePaid", () => {
  it("allows paying a scheduled line on an approved loan", () => {
    const result = markScheduleLinePaid("approved", "scheduled");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.status, "paid");
  });

  it("allows paying an overdue line on an approved loan", () => {
    const result = markScheduleLinePaid("approved", "overdue");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.status, "paid");
  });

  it("allows paying a due line on an approved loan", () => {
    const result = markScheduleLinePaid("approved", "due");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.status, "paid");
  });

  it("rejects when the loan is not approved", () => {
    const result = markScheduleLinePaid("pending_approval", "scheduled");
    assert.equal(result.ok, false);
  });

  it("rejects when the line is already paid", () => {
    const result = markScheduleLinePaid("approved", "paid");
    assert.equal(result.ok, false);
  });

  it("rejects when the line is void", () => {
    const result = markScheduleLinePaid("approved", "void");
    assert.equal(result.ok, false);
  });
});
