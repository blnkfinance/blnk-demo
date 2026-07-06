import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Response } from "express";
import { after, before, describe, it, mock } from "node:test";
import { createLoanDraft } from "../domain/loans/compose.js";
import {
  goldenInput,
  goldenNow,
  goldenProduct,
} from "../domain/loans/fixtures/golden-100k-12mo.js";
import {
  approveLoanWithFinalizedSchedule,
  createPortalSession,
  findInstallById,
  findPortalSessionRow,
  getDb,
  insertActiveInstall,
  insertLoanProduct,
  insertLoanWithSchedule,
  resetDbForTests,
} from "../db/index.js";
import { finalizeApprovedLoan } from "../domain/loans/compose.js";
import { encryptSecret } from "../lib/crypto.js";
import { resetEnvForTests } from "../lib/env.js";
import type { PortalAuthedRequest } from "../lib/requirePortalAuth.js";
import { listLoanLedgerTransactionsHandler } from "./loans.js";

const TEST_ENCRYPTION_KEY = "a".repeat(64);
const INSTALLED_APP_ID = "inst_ledger_txn_test";
const LOAN_ID = "loan_ledger_txn_test";

let tempDir: string;
let portalToken: string;
let fetchMock: ReturnType<typeof mock.method>;
let lastFilterBody: unknown;

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

function mockRequest(kind: string): PortalAuthedRequest {
  return {
    body: {},
    query: { token: portalToken, kind, page: "1", pageSize: "50" },
    params: { loan_id: LOAN_ID },
    portalAuth: {
      install: findInstallById(INSTALLED_APP_ID)!,
      session: findPortalSessionRow(portalToken)!,
    },
  } as unknown as PortalAuthedRequest;
}

function setupTestEnv(): void {
  resetDbForTests();
  resetEnvForTests();
  tempDir = mkdtempSync(path.join(tmpdir(), "loan-app-ledger-txn-test-"));
  process.env.BACKEND_PUBLIC_URL = "http://localhost:4721";
  process.env.BLNK_CLOUD_API_ORIGIN = "http://blnk.test";
  process.env.ENCRYPTION_KEY_HEX = TEST_ENCRYPTION_KEY;
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = path.join(tempDir, "test.db");
  getDb();

  insertActiveInstall({
    installed_app_id: INSTALLED_APP_ID,
    app_id: "app_test",
    instance_id: "instance_test",
    api_key_encrypted: encryptSecret("test-bearer-token"),
    api_key_prefix: "prefix",
    granted_permissions: ["data:read", "data:write"],
    status: "active",
    idempotency_key: "install:ledger-txn-test",
  });
  portalToken = createPortalSession(INSTALLED_APP_ID);

  const productId = getDb()
    .prepare(`SELECT loan_product_id FROM loan_products LIMIT 1`)
    .get() as { loan_product_id: string } | undefined;

  if (!productId) {
    insertLoanProduct({
      name: "Golden Product",
      interest_type: "fixed",
      annual_rate_bps: goldenProduct.annual_rate_bps,
      day_count_convention: goldenProduct.day_count_convention,
      payment_frequency: goldenProduct.payment_frequency,
      amortization_type: goldenProduct.amortization_type,
      grace_period_type: goldenProduct.grace_period_type,
      grace_period_days: goldenProduct.grace_period_days,
    });
  }

  const resolvedProductId =
    productId?.loan_product_id ??
    (
      getDb()
        .prepare(`SELECT loan_product_id FROM loan_products LIMIT 1`)
        .get() as { loan_product_id: string }
    ).loan_product_id;

  const draft = createLoanDraft(
    { ...goldenProduct, loan_product_id: resolvedProductId },
    { ...goldenInput, loan_product_id: resolvedProductId },
    goldenNow
  );
  assert.equal(draft.ok, true);
  if (!draft.ok) return;

  insertLoanWithSchedule(
    INSTALLED_APP_ID,
    {
      ...draft.value.loan,
      blnk_transaction: "txn_test",
      blnk_identity_id: goldenInput.blnk_identity_id,
    },
    draft.value.schedule,
    { loanId: LOAN_ID }
  );

  const finalized = finalizeApprovedLoan(
    {
      principal: draft.value.loan.principal,
      origination_fee: draft.value.loan.origination_fee,
      term_periods: draft.value.loan.term_periods,
      first_payment_date: draft.value.loan.first_payment_date,
      annual_rate_bps: draft.value.loan.annual_rate_bps,
      day_count_convention: draft.value.loan.day_count_convention,
      payment_frequency: draft.value.loan.payment_frequency,
      amortization_type: draft.value.loan.amortization_type,
      grace_period_type: draft.value.loan.grace_period_type,
      grace_period_days: draft.value.loan.grace_period_days,
      maturity_date: draft.value.loan.maturity_date,
    },
    "2025-06-15"
  );
  assert.equal(finalized.ok, true);
  if (!finalized.ok) return;

  approveLoanWithFinalizedSchedule(
    LOAN_ID,
    finalized.value.schedule,
    finalized.value.effective_annual_rate_bps,
    finalized.value.disbursement_date
  );

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

      if (init?.method === "POST" && url.includes("/transactions/filter")) {
        lastFilterBody = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({
            data: [
              {
                transaction_id: "txn_accrual_1",
                amount: 1234,
                currency: "MXN",
                created_at: "2025-07-01T00:00:00.000Z",
                reference: "ls_1_2025-07-01",
                meta_data: {
                  loan_id: LOAN_ID,
                  transaction_type: "interest_accrual",
                  period: "1",
                  accrual_date: "2025-07-01",
                },
              },
            ],
            total: 1,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("not found", { status: 404 });
    }
  );
}

describe("listLoanLedgerTransactionsHandler", () => {
  before(() => {
    setupTestEnv();
  });

  after(() => {
    fetchMock.mock.restore();
    resetDbForTests();
    resetEnvForTests();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it("filters interest accrual transactions by loan metadata", async () => {
    const res = mockResponse();
    await listLoanLedgerTransactionsHandler(mockRequest("interest_accrual"), res);

    assert.equal(res.statusCode, 200);
    const body = res.body as {
      transactions: Array<{ transaction_id: string; accrual_date: string | null }>;
      total: number;
    };
    assert.equal(body.total, 1);
    assert.equal(body.transactions[0]!.transaction_id, "txn_accrual_1");
    assert.equal(body.transactions[0]!.accrual_date, "2025-07-01");

    const filters = (lastFilterBody as { filters: Array<{ field: string; value: string }> })
      .filters;
    assert.deepEqual(
      filters.map((filter) => [filter.field, filter.value]),
      [
        ["meta_data.loan_id", LOAN_ID],
        ["meta_data.transaction_type", "interest_accrual"],
      ]
    );
  });

  it("filters principal repayment legs", async () => {
    const res = mockResponse();
    await listLoanLedgerTransactionsHandler(mockRequest("principal_repayment"), res);

    assert.equal(res.statusCode, 200);

    const filters = (lastFilterBody as { filters: Array<{ field: string; value: string }> })
      .filters;
    assert.deepEqual(
      filters.map((filter) => [filter.field, filter.value]),
      [
        ["meta_data.loan_id", LOAN_ID],
        ["meta_data.transaction_type", "loan_repayment"],
        ["meta_data.repayment_leg", "principal"],
      ]
    );
  });
});
