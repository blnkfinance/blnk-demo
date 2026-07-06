import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it, mock } from "node:test";
import {
  createPortalSession,
  findInstallById,
  getDb,
  insertActiveInstall,
  resetDbForTests,
} from "../../db/index.js";
import { encryptSecret } from "../crypto.js";
import { resetEnvForTests } from "../env.js";
import {
  fetchLoanBalanceSnapshot,
  resolveLoanBalance,
} from "./resolveLoanBalance.js";

const TEST_ENCRYPTION_KEY = "a".repeat(64);
const INSTALLED_APP_ID = "inst_resolve_loan_balance_test";
const IDENTITY_ID = "idt_resolve_loan_balance";
const LOAN_ID = "loan_resolve_loan_balance";

let tempDir: string;
let fetchMock: ReturnType<typeof mock.method>;

function mockBalancesResponse(balanceRow: Record<string, unknown>): void {
  fetchMock?.mock.restore();
  fetchMock = mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes("/data/balances")) {
        return new Response(
          JSON.stringify({ data: [balanceRow], total: 1 }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ ok: false }), { status: 404 });
    }
  );
}

describe("resolveLoanBalance", () => {
  before(() => {
    resetDbForTests();
    resetEnvForTests();
    tempDir = mkdtempSync(path.join(tmpdir(), "loan-app-resolve-balance-test-"));
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
      idempotency_key: "install:resolve-loan-balance-test",
    });
    createPortalSession(INSTALLED_APP_ID);
    mockBalancesResponse({ balance_id: "bln_placeholder", currency: "MXN" });
  });

  after(() => {
    fetchMock?.mock.restore();
    resetDbForTests();
    resetEnvForTests();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it("resolves balance_id and currency when credit_balance is omitted", async () => {
    mockBalancesResponse({
      balance_id: "bln_accrued_interest",
      currency: "MXN",
    });

    const install = findInstallById(INSTALLED_APP_ID)!;
    const resolved = await resolveLoanBalance(
      install,
      IDENTITY_ID,
      LOAN_ID,
      "accrued_interest"
    );

    assert.deepEqual(resolved, {
      balanceId: "bln_accrued_interest",
      currency: "MXN",
    });
  });

  it("defaults omitted snapshot numerics to zero", async () => {
    mockBalancesResponse({
      balance_id: "bln_loans_receivable",
      currency: "MXN",
      debit_balance: 100_000,
    });

    const install = findInstallById(INSTALLED_APP_ID)!;
    const snapshot = await fetchLoanBalanceSnapshot(
      install,
      IDENTITY_ID,
      LOAN_ID,
      "loans_receivable"
    );

    assert.deepEqual(snapshot, {
      balanceId: "bln_loans_receivable",
      currency: "MXN",
      balance: 0,
      creditBalance: 0,
      debitBalance: 100_000,
    });
  });
});
