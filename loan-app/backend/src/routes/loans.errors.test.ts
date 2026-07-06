import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Response } from "express";
import { after, before, describe, it, mock } from "node:test";
import {
  goldenProduct,
} from "../domain/loans/fixtures/golden-100k-12mo.js";
import {
  createPortalSession,
  findInstallById,
  findPortalSessionRow,
  getDb,
  insertActiveInstall,
  insertLoanProduct,
  resetDbForTests,
  upsertLoanLedger,
} from "../db/index.js";
import { resetEnvForTests } from "../lib/env.js";
import { encryptSecret } from "../lib/crypto.js";
import type { PortalAuthedRequest } from "../lib/requirePortalAuth.js";
import { createLoan } from "./loans.js";

const TEST_ENCRYPTION_KEY = "a".repeat(64);
const TEST_IDENTITY_ID = "idt_11111111-1111-4111-8111-111111111111";
let tempDir: string;
let portalToken: string;
let productId: string;
let fetchMock: ReturnType<typeof mock.method>;
let localLoanCountWhenOmniStarted = 0;

function futureDateOnly(months: number): string {
  const now = new Date();
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, now.getUTCDate())
  );
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const validCreateBody = {
  loan_product_id: "",
  blnk_identity_id: TEST_IDENTITY_ID,
  principal: 1_000_000,
  origination_fee: 2_000,
  term_periods: 12,
  first_payment_date: futureDateOnly(2),
};

function setupTestEnv(): void {
  resetDbForTests();
  resetEnvForTests();
  tempDir = mkdtempSync(path.join(tmpdir(), "loan-app-errors-test-"));
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
    idempotency_key: "install:test",
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

  upsertLoanLedger({
    installed_app_id: "inst_test",
    instance_id: "instance_test",
    ledger_key: "loans_receivable",
    name: "Loans Receivable Ledger",
    blnk_ledger_id: "ldg_receivable",
  });
  upsertLoanLedger({
    installed_app_id: "inst_test",
    instance_id: "instance_test",
    ledger_key: "deferred_fee",
    name: "Deferred Fee Ledger",
    blnk_ledger_id: "ldg_deferred",
  });
  upsertLoanLedger({
    installed_app_id: "inst_test",
    instance_id: "instance_test",
    ledger_key: "accrued_interest",
    name: "Accrued Interest Ledger",
    blnk_ledger_id: "ldg_interest",
  });
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

function mockRequest(body: unknown): PortalAuthedRequest {
  const install = findInstallById("inst_test")!;
  const session = findPortalSessionRow(portalToken)!;
  return {
    body,
    query: { token: portalToken },
    params: {},
    portalAuth: { install, session },
  } as unknown as PortalAuthedRequest;
}

function mockEligibleBalancesFetch(options: { blnkCreateFails?: boolean } = {}): void {
  localLoanCountWhenOmniStarted = 0;
  fetchMock = mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method =
      init?.method ??
      (typeof input === "object" && "method" in input && typeof input.method === "string"
        ? input.method
        : "GET");

    if (url.includes("/data/balances")) {
      return new Response(
        JSON.stringify({
          data: [{ balance_id: "bln_test", currency: "MXN", meta_data: { book: "a_book" } }],
          total: 1,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (method === "POST" && url.includes("/proxy/balances")) {
      localLoanCountWhenOmniStarted = (
        getDb().prepare(`SELECT COUNT(*) AS count FROM loans`).get() as {
          count: number;
        }
      ).count;
      if (options.blnkCreateFails) {
        return new Response("balance create failed", { status: 502 });
      }
      return new Response(JSON.stringify({ balance_id: "bln_loan_balance" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "POST" && url.includes("/proxy/ledgers")) {
      return new Response(JSON.stringify({ ledger_id: "ldg_test" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/data/ledgers")) {
      return new Response(JSON.stringify({ data: [], total: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "POST" && url.includes("/proxy/transactions")) {
      return new Response(
        JSON.stringify({
          transaction_id: "txn_parent",
          meta_data: { QUEUED_PARENT_TRANSACTION: "txn_queued_parent" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: false }), { status: 404 });
  });
}

describe("createLoan validation errors", () => {
  before(() => {
    setupTestEnv();
    mockEligibleBalancesFetch();
  });

  after(() => {
    fetchMock?.mock.restore();
    resetDbForTests();
    resetEnvForTests();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns field_errors when origination fee exceeds principal", async () => {
    const res = mockResponse();
    await createLoan(
      mockRequest({
        ...validCreateBody,
        loan_product_id: productId,
        origination_fee: 1_000_000,
      }),
      res
    );

    assert.equal(res.statusCode, 400);
    const body = res.body as {
      ok: false;
      error: string;
      field_errors?: Record<string, string>;
    };
    assert.equal(body.ok, false);
    assert.equal(
      body.field_errors?.origination_fee,
      "Origination fee must be less than the loan amount."
    );
  });

  it("returns field_errors for invalid zod input", async () => {
    const res = mockResponse();
    await createLoan(
      mockRequest({
        loan_product_id: "",
        principal: -1,
        origination_fee: 0,
        term_periods: 0,
        first_payment_date: "not-a-date",
      }),
      res
    );

    assert.equal(res.statusCode, 400);
    const body = res.body as {
      ok: false;
      field_errors?: Record<string, string>;
    };
    assert.ok(body.field_errors);
    assert.equal(body.field_errors?.loan_product_id, "Choose a loan product.");
    assert.equal(body.field_errors?.first_payment_date, "Enter a valid first payment date.");
  });

  it("returns field_errors when customer is missing", async () => {
    const res = mockResponse();
    await createLoan(
      mockRequest({
        loan_product_id: productId,
        principal: 1_000_000,
        origination_fee: 2_000,
        term_periods: 12,
        first_payment_date: "2025-07-01",
      }),
      res
    );

    assert.equal(res.statusCode, 400);
    const body = res.body as {
      ok: false;
      field_errors?: Record<string, string>;
    };
    assert.equal(body.field_errors?.blnk_identity_id, "Choose a customer.");
  });

  it("returns 502 when Omni balance creation fails after validation", async () => {
    fetchMock.mock.restore();
    mockEligibleBalancesFetch({ blnkCreateFails: true });

    const res = mockResponse();
    await createLoan(
      mockRequest({
        ...validCreateBody,
        loan_product_id: productId,
      }),
      res
    );

    assert.equal(res.statusCode, 502);
    const body = res.body as { ok: false; error: string };
    assert.equal(body.ok, false);
    assert.match(body.error, /balance/i);
    assert.ok(localLoanCountWhenOmniStarted > 0);

    const persisted = getDb()
      .prepare(
        `SELECT status, blnk_transaction
         FROM loans
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .get() as { status: string; blnk_transaction: string | null } | undefined;
    assert.ok(persisted);
    assert.equal(persisted!.status, "pending_approval");
    assert.equal(persisted!.blnk_transaction, null);
  });
});
