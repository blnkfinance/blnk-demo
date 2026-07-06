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
  upsertLoanLedger,
  type InstallRow,
} from "../../db/index.js";
import { encryptSecret } from "../crypto.js";
import { resetEnvForTests } from "../env.js";
import { createLoanBalances } from "./loanBalances.js";

const TEST_ENCRYPTION_KEY = "a".repeat(64);

let tempDir: string;
let install: InstallRow;
let fetchMock: ReturnType<typeof mock.method>;
let balanceCreateCalls: Record<string, unknown>[] = [];

function setupTestEnv(): void {
  resetDbForTests();
  resetEnvForTests();
  tempDir = mkdtempSync(path.join(tmpdir(), "loan-balances-test-"));
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
    idempotency_key: "install:loan-balances-test",
  });

  install = findInstallById("inst_test")!;

  upsertLoanLedger({
    installed_app_id: install.installed_app_id,
    instance_id: install.instance_id,
    ledger_key: "loans_receivable",
    name: "Loans Receivable Ledger",
    blnk_ledger_id: "ldg_receivable",
  });
  upsertLoanLedger({
    installed_app_id: install.installed_app_id,
    instance_id: install.instance_id,
    ledger_key: "deferred_fee",
    name: "Deferred Fee Ledger",
    blnk_ledger_id: "ldg_deferred",
  });
  upsertLoanLedger({
    installed_app_id: install.installed_app_id,
    instance_id: install.instance_id,
    ledger_key: "accrued_interest",
    name: "Accrued Interest Ledger",
    blnk_ledger_id: "ldg_interest",
  });
}

describe("createLoanBalances", () => {
  before(() => {
    setupTestEnv();
    balanceCreateCalls = [];
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

      if (method === "POST" && url.includes("/proxy/balances")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        balanceCreateCalls.push(body);
        const ledgerKey =
          typeof body.meta_data === "object" &&
          body.meta_data !== null &&
          "ledger_key" in body.meta_data
            ? String((body.meta_data as Record<string, unknown>).ledger_key)
            : "unknown";
        return new Response(
          JSON.stringify({ balance_id: `bln_${ledgerKey}` }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/data/ledgers")) {
        return new Response(JSON.stringify({ data: [], total: 0 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (method === "POST" && url.includes("/proxy/ledgers")) {
        return new Response(JSON.stringify({ ledger_id: "ldg_created" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: false }), { status: 404 });
    });
  });

  after(() => {
    fetchMock.mock.restore();
    resetDbForTests();
    resetEnvForTests();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates three balances tagged with loan_id metadata", async () => {
    const result = await createLoanBalances(install, {
      loanId: "loan_test_123",
      identityId: "idt_test",
      currency: "MXN",
    });

    assert.equal(result.loansReceivableBalanceId, "bln_loans_receivable");
    assert.equal(result.deferredFeeBalanceId, "bln_deferred_fee");
    assert.equal(result.accruedInterestBalanceId, "bln_accrued_interest");
    assert.equal(balanceCreateCalls.length, 3);

    for (const call of balanceCreateCalls) {
      const meta = call.meta_data as Record<string, string>;
      assert.equal(meta.managed_by, "loan-app");
      assert.equal(meta.loan_id, "loan_test_123");
      assert.ok(["loans_receivable", "deferred_fee", "accrued_interest"].includes(meta.ledger_key));
      assert.equal(call.identity_id, "idt_test");
      assert.equal(call.currency, "MXN");
    }
  });
});
