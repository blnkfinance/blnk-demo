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
  findPortalSessionRow,
  findScheduleByLoanId,
  getDb,
  insertActiveInstall,
  insertLoanProduct,
  insertLoanWithSchedule,
  resetDbForTests,
} from "../db/index.js";
import { encryptSecret } from "../lib/crypto.js";
import { resetEnvForTests } from "../lib/env.js";
import type { PortalAuthedRequest } from "../lib/requirePortalAuth.js";
import { simulateInterestAccrual } from "./loans.js";

const TEST_ENCRYPTION_KEY = "a".repeat(64);
const INSTALLED_APP_ID = "inst_interest_accrual_test";
const IDENTITY_ID = "idt_11111111-1111-4111-8111-111111111111";

let tempDir: string;
let portalToken: string;
let fetchMock: ReturnType<typeof mock.method>;
let transactionPostCount = 0;

type MockResponse = Response & {
  statusCode: number;
  body: unknown;
};

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addMonthsUtc(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate())
  );
}

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

function mockRequest(loanId: string, loanScheduleId: string): PortalAuthedRequest {
  return {
    body: {},
    query: { token: portalToken },
    params: { loan_id: loanId, loan_schedule_id: loanScheduleId },
    portalAuth: {
      install: findInstallById(INSTALLED_APP_ID)!,
      session: findPortalSessionRow(portalToken)!,
    },
  } as unknown as PortalAuthedRequest;
}

function setupTestEnv(): void {
  resetDbForTests();
  resetEnvForTests();
  tempDir = mkdtempSync(path.join(tmpdir(), "loan-app-interest-accrual-test-"));
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
    idempotency_key: "install:interest-accrual-test",
  });
  portalToken = createPortalSession(INSTALLED_APP_ID);

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

      if (url.includes("/data/balances")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                balance_id: "bln_accrued_interest",
                currency: "MXN",
                balance: 0,
                credit_balance: 0,
                debit_balance: 0,
              },
            ],
            total: 1,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (
        init?.method === "POST" &&
        url.includes("/proxy/transactions") &&
        !url.includes("/bulk")
      ) {
        transactionPostCount += 1;
        return new Response(
          JSON.stringify({
            transaction_id: `txn_accrual_${transactionPostCount}`,
            meta_data: { QUEUED_PARENT_TRANSACTION: "txn_accrual_parent" },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ ok: false }), { status: 404 });
    }
  );
}

describe("simulateInterestAccrual", () => {
  before(() => {
    setupTestEnv();
  });

  after(() => {
    fetchMock?.mock.restore();
    resetDbForTests();
    resetEnvForTests();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it("persists the first transaction id and rejects a follow-on attempt", async () => {
    transactionPostCount = 0;
    const now = new Date();
    const product = insertLoanProduct({
      name: "Interest Accrual Test Product",
      interest_type: "fixed",
      annual_rate_bps: goldenProduct.annual_rate_bps,
      day_count_convention: goldenProduct.day_count_convention,
      payment_frequency: goldenProduct.payment_frequency,
      amortization_type: goldenProduct.amortization_type,
      grace_period_type: goldenProduct.grace_period_type,
      grace_period_days: goldenProduct.grace_period_days,
    });
    const firstPaymentDate = dateOnly(addMonthsUtc(now, 2));
    const draft = createLoanDraft(
      { ...goldenProduct, loan_product_id: product.loan_product_id },
      {
        ...goldenInput,
        loan_product_id: product.loan_product_id,
        blnk_identity_id: IDENTITY_ID,
        first_payment_date: firstPaymentDate,
      },
      now
    );
    assert.equal(draft.ok, true);
    if (!draft.ok) return;

    const loan = insertLoanWithSchedule(
      INSTALLED_APP_ID,
      { ...draft.value.loan, blnk_transaction: "txn_disbursement" },
      draft.value.schedule
    );
    getDb()
      .prepare(
        `UPDATE loans
         SET status = 'approved', disbursement_date = ?, decided_at = ?
         WHERE loan_id = ?`
      )
      .run(dateOnly(now), now.toISOString(), loan.loan_id);

    const line = findScheduleByLoanId(loan.loan_id)[0]!;
    const first = mockResponse();
    await simulateInterestAccrual(
      mockRequest(loan.loan_id, line.loan_schedule_id),
      first
    );

    assert.equal(first.statusCode, 200);
    assert.ok(transactionPostCount > 1);
    const postsAfterFirst = transactionPostCount;
    assert.equal(
      findScheduleByLoanId(loan.loan_id)[0]!.interest_blnk_transaction,
      line.loan_schedule_id
    );

    const second = mockResponse();
    await simulateInterestAccrual(
      mockRequest(loan.loan_id, line.loan_schedule_id),
      second
    );

    assert.equal(second.statusCode, 409);
    assert.equal(transactionPostCount, postsAfterFirst);
    assert.deepEqual(second.body, {
      ok: false,
      error: "Interest accrual has already been simulated for this installment.",
    });
  });
});
