import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Response } from "express";
import { after, before, describe, it, mock } from "node:test";
import { createLoanDraft } from "../domain/loans/compose.js";
import {
  goldenInput,
  goldenProduct,
} from "../domain/loans/fixtures/golden-100k-12mo.js";
import {
  createPortalSession,
  findInstallById,
  findLoanById,
  findPortalSessionRow,
  getDb,
  insertActiveInstall,
  insertLoanProduct,
  insertLoanWithSchedule,
  resetDbForTests,
} from "../db/index.js";
import { resetEnvForTests } from "../lib/env.js";
import { encryptSecret } from "../lib/crypto.js";
import type { PortalAuthedRequest } from "../lib/requirePortalAuth.js";
import { approveLoan, rejectLoan } from "./loans.js";

const TEST_ENCRYPTION_KEY = "a".repeat(64);
let tempDir: string;
let portalToken: string;
let productId: string;
let fetchMock: ReturnType<typeof mock.method>;
let commitCallCount = 0;
let voidCallCount = 0;
let blnkCommitFails = false;
let blnkVoidFails = false;

function resetCounters(): void {
  commitCallCount = 0;
  voidCallCount = 0;
  blnkCommitFails = false;
  blnkVoidFails = false;
}

function setupTestEnv(): void {
  resetDbForTests();
  resetEnvForTests();
  tempDir = mkdtempSync(path.join(tmpdir(), "loan-app-approve-test-"));
  process.env.BACKEND_PUBLIC_URL = "http://localhost:4721";
  process.env.ENCRYPTION_KEY_HEX = TEST_ENCRYPTION_KEY;
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = path.join(tempDir, "test.db");
  getDb();

  insertActiveInstall({
    installed_app_id: "inst_test",
    app_id: "app_test",
    instance_id: "instance_test",
    api_key_encrypted: encryptSecret("test-bearer-token"),
    api_key_prefix: "prefix",
    granted_permissions: ["data:read", "data:write"],
    status: "active",
    idempotency_key: "install:approve-test",
  });
  portalToken = createPortalSession("inst_test");

  const product = insertLoanProduct({
    name: "Test Product",
    interest_type: "fixed",
    annual_rate_bps: goldenProduct.annual_rate_bps,
    day_count_convention: goldenProduct.day_count_convention,
    payment_frequency: goldenProduct.payment_frequency,
    amortization_type: goldenProduct.amortization_type,
    grace_period_type: goldenProduct.grace_period_type,
    grace_period_days: goldenProduct.grace_period_days,
  });
  productId = product.loan_product_id;
}

type MockResponse = Response & {
  statusCode: number;
  body: unknown;
};

function mockResponse(): MockResponse {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
  };
  return res as MockResponse;
}

function mockRequest(
  loanId: string,
  body: unknown = {}
): PortalAuthedRequest {
  const install = findInstallById("inst_test")!;
  const session = findPortalSessionRow(portalToken)!;
  return {
    body,
    query: { token: portalToken },
    params: { loan_id: loanId },
    portalAuth: { install, session },
  } as unknown as PortalAuthedRequest;
}

function mockOmniFetch(): void {
  fetchMock = mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const method =
        init?.method ??
        (typeof input === "object" &&
        "method" in input &&
        typeof input.method === "string"
          ? input.method
          : "GET");

      if (method === "PUT" && url.includes("/proxy/transactions/inflight/")) {
        if (init?.body && typeof init.body === "string") {
          const payload = JSON.parse(init.body) as { status?: string };
          if (payload.status === "commit") {
            commitCallCount += 1;
            if (blnkCommitFails) {
              return new Response("commit failed", { status: 502 });
            }
          }
          if (payload.status === "void") {
            voidCallCount += 1;
            if (blnkVoidFails) {
              return new Response("void failed", { status: 502 });
            }
          }
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: false }), { status: 404 });
    }
  );
}

function addMonthsUtc(date: Date, months: number): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate())
  );
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function insertPendingLoan(options: {
  firstPaymentDate?: string;
  blnkTransaction?: string;
} = {}) {
  const accrualNow = new Date();
  const firstPaymentDate =
    options.firstPaymentDate ?? addMonthsUtc(accrualNow, 2);

  const draft = createLoanDraft(
    { ...goldenProduct, loan_product_id: productId },
    {
      ...goldenInput,
      loan_product_id: productId,
      first_payment_date: firstPaymentDate,
    },
    accrualNow
  );
  assert.equal(draft.ok, true);
  if (!draft.ok) {
    throw new Error("draft failed");
  }

  return insertLoanWithSchedule(
    "inst_test",
    {
      ...draft.value.loan,
      blnk_transaction: options.blnkTransaction ?? "txn_queued_parent",
    },
    draft.value.schedule
  );
}

describe("approveLoan", () => {
  before(() => {
    setupTestEnv();
    mockOmniFetch();
  });

  after(() => {
    fetchMock?.mock.restore();
    resetDbForTests();
    resetEnvForTests();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns 409 without committing Omni when first payment is before disbursement", async () => {
    resetCounters();
    const loan = insertPendingLoan({ firstPaymentDate: "2026-06-01" });
    const res = mockResponse();

    await approveLoan(mockRequest(loan.loan_id), res);

    assert.equal(res.statusCode, 409);
    assert.equal(commitCallCount, 0);
    assert.equal(findLoanById(loan.loan_id)!.status, "pending_approval");
  });

  it("returns 502 when Omni commit fails after local approval", async () => {
    resetCounters();
    blnkCommitFails = true;
    const loan = insertPendingLoan();
    const res = mockResponse();

    await approveLoan(mockRequest(loan.loan_id), res);

    assert.equal(res.statusCode, 502);
    assert.equal(commitCallCount, 1);
    assert.equal(findLoanById(loan.loan_id)!.status, "approved");
  });

  it("returns 409 on second approve without calling Omni again", async () => {
    resetCounters();
    const loan = insertPendingLoan();
    const first = mockResponse();
    await approveLoan(mockRequest(loan.loan_id), first);
    assert.equal(first.statusCode, 200);
    assert.equal(commitCallCount, 1);

    const second = mockResponse();
    await approveLoan(mockRequest(loan.loan_id), second);
    assert.equal(second.statusCode, 409);
    assert.equal(commitCallCount, 1);
  });
});

describe("rejectLoan", () => {
  before(() => {
    setupTestEnv();
    mockOmniFetch();
  });

  after(() => {
    fetchMock?.mock.restore();
    resetDbForTests();
    resetEnvForTests();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns 502 when Omni void fails after local rejection", async () => {
    resetCounters();
    blnkVoidFails = true;
    const loan = insertPendingLoan();
    const res = mockResponse();

    await rejectLoan(mockRequest(loan.loan_id, { decision_note: null }), res);

    assert.equal(res.statusCode, 502);
    assert.equal(voidCallCount, 1);
    assert.equal(findLoanById(loan.loan_id)!.status, "rejected");
  });

  it("returns 409 on second reject without calling Omni void again", async () => {
    resetCounters();
    const loan = insertPendingLoan();
    const first = mockResponse();
    await rejectLoan(mockRequest(loan.loan_id, { decision_note: "no" }), first);
    assert.equal(first.statusCode, 200);
    assert.equal(voidCallCount, 1);

    const second = mockResponse();
    await rejectLoan(mockRequest(loan.loan_id, { decision_note: "no" }), second);
    assert.equal(second.statusCode, 409);
    assert.equal(voidCallCount, 1);
  });
});
