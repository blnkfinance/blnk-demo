import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it, mock } from "node:test";
import { findInstallById, getDb, insertActiveInstall, resetDbForTests } from "../../db/index.js";
import { encryptSecret } from "../crypto.js";
import { resetEnvForTests } from "../env.js";
import { normalizeTransactionItem, postTransactionsSequentially } from "./bulkTransactions.js";

const TEST_ENCRYPTION_KEY = "a".repeat(64);
const INSTALLED_APP_ID = "inst_sequential_txn_test";

const sampleTransaction = {
  precise_amount: 100,
  currency: "MXN",
  source: "bln_source",
  destination: "@Interest-Income",
  reference: "ref_1",
  allow_overdraft: true,
  meta_data: {
    managed_by: "loan-app",
    transaction_type: "interest_accrual",
    loan_schedule_id: "ls_test",
  },
};

let tempDir: string;
let fetchMock: ReturnType<typeof mock.method>;

function setupTestEnv(): void {
  resetDbForTests();
  resetEnvForTests();
  tempDir = mkdtempSync(path.join(tmpdir(), "loan-app-sequential-txn-test-"));
  process.env.BACKEND_PUBLIC_URL = "http://localhost:4721";
  process.env.BLNK_CLOUD_API_ORIGIN = "https://core.omnigroup.tech";
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
    idempotency_key: "install:sequential-txn-test",
  });
}

describe("normalizeTransactionItem", () => {
  it("adds precision 100", () => {
    const item = normalizeTransactionItem(sampleTransaction);
    assert.equal(item.precision, 100);
    assert.equal(item.precise_amount, 100);
  });
});

describe("postTransactionsSequentially", () => {
  before(() => {
    setupTestEnv();
  });

  after(() => {
    fetchMock?.mock.restore();
    resetDbForTests();
    resetEnvForTests();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it("posts each transaction to /proxy/transactions in order", async () => {
    let postCount = 0;
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

        if (
          init?.method === "POST" &&
          url.includes("/proxy/transactions") &&
          !url.includes("/bulk")
        ) {
          postCount += 1;
          return new Response(JSON.stringify({ transaction_id: `txn_${postCount}` }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ ok: false }), { status: 404 });
      }
    );

    const install = findInstallById(INSTALLED_APP_ID)!;
    const result = await postTransactionsSequentially(install, [
      sampleTransaction,
      { ...sampleTransaction, reference: "ref_2" },
    ]);

    assert.equal(postCount, 2);
    assert.equal(result.transactionCount, 2);
  });
});
