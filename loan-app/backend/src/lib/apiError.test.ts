import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import {
  domainValidationResponse,
  validationError,
  zodSummary,
  zodToFieldErrors,
  zodValidationResponse,
} from "./apiError.js";

describe("apiError", () => {
  it("maps zod issues to field keys", () => {
    const schema = z.object({
      principal: z.number().int().positive("Enter a loan amount greater than zero."),
      origination_fee: z.number().int().min(0, "Enter a non-negative origination fee."),
    });
    const parsed = schema.safeParse({ principal: -1, origination_fee: -5 });
    assert.equal(parsed.success, false);
    if (parsed.success) return;

    const field_errors = zodToFieldErrors(parsed.error);
    assert.equal(field_errors.principal, "Enter a loan amount greater than zero.");
    assert.equal(field_errors.origination_fee, "Enter a non-negative origination fee.");
    assert.equal(zodSummary(parsed.error, field_errors), "Fix the highlighted fields.");
  });

  it("builds a validation response from zod", () => {
    const schema = z.object({
      name: z.string().min(1, "Enter a product name."),
    });
    const parsed = schema.safeParse({ name: "" });
    assert.equal(parsed.success, false);
    if (parsed.success) return;

    const body = zodValidationResponse(parsed.error);
    assert.equal(body.error, "Enter a product name.");
    assert.deepEqual(body.field_errors, { name: "Enter a product name." });
  });

  it("maps domain errors to field keys", () => {
    const body = domainValidationResponse(
      "Origination fee must be less than the loan amount.",
      { "Origination fee must be less than the loan amount.": "origination_fee" }
    );
    assert.equal(body.error, "Origination fee must be less than the loan amount.");
    assert.deepEqual(body.field_errors, {
      origination_fee: "Origination fee must be less than the loan amount.",
    });
  });

  it("omits field_errors when empty", () => {
    const body = validationError("Something went wrong.");
    assert.equal(body.field_errors, undefined);
  });
});
