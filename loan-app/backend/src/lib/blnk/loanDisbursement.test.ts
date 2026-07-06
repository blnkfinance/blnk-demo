import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it, mock } from "node:test";
import {
  findInstallById,
  getDb,
  insertActiveInstall,
  resetDbForTests,
  type InstallRow,
} from "../../db/index.js";
import { encryptSecret } from "../crypto.js";
import { resetEnvForTests } from "../env.js";
import {
  commitInflightTransaction,
  createDisbursementInflight,
  resolveDisbursementBalance,
  voidInflightTransaction,
  type LoanDisbursementMeta,
} from "./loanDisbursement.js";

const TEST_ENCRYPTION_KEY = "a".repeat(64);
const TEST_IDENTITY_ID = "idt_11111111-1111-4111-8111-111111111111";

let tempDir: string;
let install: InstallRow;
let fetchMock: ReturnType<typeof mock.method>;
let lastTransactionBody: Record<string, unknown> | null = null;
let lastInflightPut: { url: string; body: Record<string, unknown> } | null = null;

const sampleLoanMeta: LoanDisbursementMeta = {
  loanId: "loan_test",
  loanProductId: "lpr_test",
  principal: 1_000_000,
  originationFee: 20_000,
  netDisbursement: 980_000,
  termPeriods: 12,
  firstPaymentDate: "2026-07-01",
  annualRateBps: 2400,
  effectiveAnnualRateBps: 2650,
  paymentFrequency: "monthly",
  amortizationType: "equal_installments",
  disbursementBook: "a_book",
};

function disbursementParams(
  loan: Partial<LoanDisbursementMeta> = {}
): Parameters<typeof createDisbursementInflight>[1] {
  return {
    currency: "MXN",
    loansReceivableBalanceId: "bln_receivable",
    deferredFeeBalanceId: "bln_deferred",
    disbursementBalanceId: "bln_cash",
    loan: { ...sampleLoanMeta, ...loan },
  };
}

function setupTestEnv(): void {
  resetDbForTests();
  resetEnvForTests();
  tempDir = mkdtempSync(path.join(tmpdir(), "loan-disbursement-test-"));
  process.env.BACKEND_PUBLIC_URL = "http://localhost:4721";
  process.env.BLNK_CLOUD_API_ORIGIN = "https://core.omnigroup.tech";
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
    idempotency_key: "install:loan-disbursement-test",
  });

  install = findInstallById("inst_test")!;
}

function mockOmniFetch(booksByIdentity: Record<string, Partial<Record<"a_book" | "b_book" | "justo", { balance_id: string; currency: string }>>>) {
  lastTransactionBody = null;
  lastInflightPut = null;

  fetchMock = mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const parsed = new URL(url);
    const method =
      init?.method ??
      (typeof input === "object" && "method" in input && typeof input.method === "string"
        ? input.method
        : "GET");

    if (method === "POST" && url.includes("/proxy/transactions") && !url.includes("/inflight/")) {
      lastTransactionBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          transaction_id: "txn_parent",
          status: "QUEUED",
          meta_data: { QUEUED_PARENT_TRANSACTION: "txn_queued_parent" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (method === "PUT" && url.includes("/proxy/transactions/inflight/")) {
      lastInflightPut = {
        url,
        body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
      };
      return new Response(JSON.stringify({ status: "APPLIED" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/data/balances")) {
      const identityId = parsed.searchParams.get("identity_id_eq");
      const book = parsed.searchParams.get("meta_data.book_eq") as
        | "a_book"
        | "b_book"
        | "justo"
        | null;
      const identityBooks = identityId ? booksByIdentity[identityId] : undefined;
      const hit = book && identityBooks?.[book];
      if (hit) {
        return new Response(
          JSON.stringify({
            data: [{ balance_id: hit.balance_id, currency: hit.currency, meta_data: { book } }],
            total: 1,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ data: [], total: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: false }), { status: 404 });
  });
}

describe("loanDisbursement", () => {
  before(() => {
    setupTestEnv();
  });

  after(() => {
    fetchMock?.mock.restore();
    resetDbForTests();
    resetEnvForTests();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it("resolves disbursement balance with a_book > b_book > justo priority", async () => {
    mockOmniFetch({
      [TEST_IDENTITY_ID]: {
        a_book: { balance_id: "bln_a", currency: "MXN" },
        b_book: { balance_id: "bln_b", currency: "MXN" },
        justo: { balance_id: "bln_j", currency: "MXN" },
      },
    });

    const result = await resolveDisbursementBalance(install, TEST_IDENTITY_ID, [
      "justo",
      "b_book",
      "a_book",
    ]);

    assert.equal(result.balanceId, "bln_a");
    assert.equal(result.book, "a_book");
  });

  it("falls back to b_book when a_book is missing", async () => {
    mockOmniFetch({
      [TEST_IDENTITY_ID]: {
        b_book: { balance_id: "bln_b", currency: "MXN" },
      },
    });

    const result = await resolveDisbursementBalance(install, TEST_IDENTITY_ID, [
      "a_book",
      "b_book",
    ]);

    assert.equal(result.balanceId, "bln_b");
    assert.equal(result.book, "b_book");
  });

  it("creates split inflight with fee destination when origination fee is positive", async () => {
    mockOmniFetch({});

    const blnkTransaction = await createDisbursementInflight(install, disbursementParams());

    assert.equal(blnkTransaction, "txn_queued_parent");
    assert.ok(lastTransactionBody);
    assert.equal(lastTransactionBody!.source, "bln_receivable");
    assert.equal(lastTransactionBody!.precise_amount, 1_000_000);
    assert.equal(lastTransactionBody!.inflight, true);
    assert.equal(lastTransactionBody!.allow_overdraft, true);
    assert.equal(lastTransactionBody!.skip_queue, undefined);

    const meta = lastTransactionBody!.meta_data as Record<string, string>;
    assert.equal(meta.transaction_type, "loan_disbursement");
    assert.equal(meta.managed_by, "loan-app");
    assert.equal(meta.loan_id, "loan_test");
    assert.equal(meta.loan_product_id, "lpr_test");
    assert.equal(meta.principal, "1000000");
    assert.equal(meta.term_periods, "12");
    assert.equal(meta.disbursement_book, "a_book");
    assert.equal(meta.blnk_identity_id, undefined);
    assert.equal(meta.maturity_date, undefined);
    assert.equal(meta.grace_period_type, undefined);
    assert.equal(meta.day_count_convention, undefined);

    const destinations = lastTransactionBody!.destinations as Record<string, unknown>[];
    assert.equal(destinations.length, 2);
    assert.deepEqual(destinations[0], {
      identifier: "bln_cash",
      precise_distribution: "980000",
    });
    assert.deepEqual(destinations[1], {
      identifier: "bln_deferred",
      precise_distribution: "20000",
    });
  });

  it("creates single-destination inflight when origination fee is zero", async () => {
    mockOmniFetch({});

    await createDisbursementInflight(
      install,
      disbursementParams({
        originationFee: 0,
        netDisbursement: 1_000_000,
      })
    );

    const destinations = lastTransactionBody!.destinations as Record<string, unknown>[];
    assert.equal(destinations.length, 1);
    assert.equal(destinations[0]!.identifier, "bln_cash");
  });

  it("commits and voids inflight using skip_queue", async () => {
    mockOmniFetch({});

    await commitInflightTransaction(install, "txn_queued_parent");
    assert.ok(lastInflightPut);
    assert.match(lastInflightPut!.url, /\/proxy\/transactions\/inflight\/txn_queued_parent/);
    assert.deepEqual(lastInflightPut!.body, { status: "commit", skip_queue: true });

    await voidInflightTransaction(install, "txn_queued_parent");
    assert.deepEqual(lastInflightPut!.body, { status: "void", skip_queue: true });
  });
});
