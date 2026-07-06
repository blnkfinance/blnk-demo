import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loansListPath, parseLoanListStatus } from "./list-route";

describe("parseLoanListStatus", () => {
  it("parses valid statuses", () => {
    assert.equal(parseLoanListStatus("approved"), "approved");
    assert.equal(parseLoanListStatus("pending_approval"), "pending_approval");
  });

  it("rejects invalid values", () => {
    assert.equal(parseLoanListStatus("active"), null);
    assert.equal(parseLoanListStatus(null), null);
  });
});

describe("loansListPath", () => {
  it("includes status in the query string", () => {
    assert.equal(loansListPath("approved"), "/loans?status=approved");
    assert.equal(loansListPath(), "/loans");
  });
});
