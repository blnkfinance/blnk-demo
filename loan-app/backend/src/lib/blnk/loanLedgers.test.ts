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
import { ensureLoanLedgers } from "./loanLedgers.js";

const TEST_ENCRYPTION_KEY = "a".repeat(64);

let tempDir: string;
let install: InstallRow;
let fetchMock: ReturnType<typeof mock.method>;
let createCalls = 0;

function setupTestEnv(): void {
  resetDbForTests();
  resetEnvForTests();
  tempDir = mkdtempSync(path.join(tmpdir(), "loan-ledgers-test-"));
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
    idempotency_key: "install:ledgers-test",
  });

  install = findInstallById("inst_test")!;
}

function mockExistingLedgers(options: { detailGetStatus?: number } = {}): void {
  const detailGetStatus = options.detailGetStatus ?? 404;
  createCalls = 0;
  fetchMock = mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const parsed = new URL(url);
    const method =
      typeof input === "object" && "method" in input && typeof input.method === "string"
        ? input.method
        : "GET";

    if (method === "POST" && url.includes("/proxy/ledgers")) {
      createCalls += 1;
      return new Response(
        JSON.stringify({ ledger_id: `ldg_created_${createCalls}` }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!url.includes("/data/ledgers")) {
      return new Response(JSON.stringify({ ok: false }), { status: 404 });
    }

    const ledgerKey = parsed.searchParams.get("meta_data.ledger_key_eq");
    if (ledgerKey === "loans_receivable") {
      return new Response(
        JSON.stringify({
          data: [
            {
              ledger_id: "ldg_newer",
              name: "Loans Receivable Ledger",
              created_at: "2026-06-28T06:10:32.131501Z",
            },
            {
              ledger_id: "ldg_older",
              name: "Loans Receivable Ledger",
              created_at: "2026-06-28T06:10:32.027579Z",
            },
          ],
          total: 2,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (ledgerKey === "accrued_interest" || ledgerKey === "deferred_fee") {
      return new Response(JSON.stringify({ data: [], total: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const nameEq = parsed.searchParams.get("name_eq");
    if (nameEq === "Accrued Interest Ledger") {
      return new Response(
        JSON.stringify({
          data: [
            {
              ledger_id: "ldg_interest",
              name: "Accrued Interest Ledger",
              created_at: "2026-06-28T06:10:32.6999Z",
            },
          ],
          total: 1,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (nameEq === "Deferred Fee Ledger") {
      return new Response(
        JSON.stringify({
          data: [
            {
              ledger_id: "ldg_fee",
              name: "Deferred Fee Ledger",
              created_at: "2026-06-28T06:10:33.333175Z",
            },
          ],
          total: 1,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/data/ledgers/")) {
      return new Response(JSON.stringify({ error: "Failed to fetch ledger details" }), {
        status: detailGetStatus,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: [], total: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

describe("ensureLoanLedgers", () => {
  before(() => {
    setupTestEnv();
  });

  after(() => {
    fetchMock?.mock.restore();
    resetDbForTests();
    resetEnvForTests();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it("reuses the oldest existing ledger for a ledger_key instead of creating a duplicate", async () => {
    mockExistingLedgers();

    const rows = await ensureLoanLedgers(install);
    const loansReceivable = rows.find((row) => row.ledger_key === "loans_receivable");

    assert.equal(loansReceivable?.blnk_ledger_id, "ldg_older");
    assert.equal(loansReceivable?.instance_id, "instance_test");
    assert.equal(createCalls, 0);
  });

  it("ignores stored ledgers from a different instance and re-discovers on Omni", async () => {
    upsertLoanLedger({
      installed_app_id: install.installed_app_id,
      instance_id: "instance_other",
      ledger_key: "loans_receivable",
      name: "Loans Receivable Ledger",
      blnk_ledger_id: "ldg_stale",
    });
    upsertLoanLedger({
      installed_app_id: install.installed_app_id,
      instance_id: "instance_other",
      ledger_key: "accrued_interest",
      name: "Accrued Interest Ledger",
      blnk_ledger_id: "ldg_stale_interest",
    });
    upsertLoanLedger({
      installed_app_id: install.installed_app_id,
      instance_id: "instance_other",
      ledger_key: "deferred_fee",
      name: "Deferred Fee Ledger",
      blnk_ledger_id: "ldg_stale_fee",
    });

    mockExistingLedgers();

    const rows = await ensureLoanLedgers(install);
    const loansReceivable = rows.find((row) => row.ledger_key === "loans_receivable");

    assert.equal(loansReceivable?.blnk_ledger_id, "ldg_older");
    assert.equal(loansReceivable?.instance_id, "instance_test");
    assert.equal(createCalls, 0);
  });

  it("falls back to discovery when stored ledger detail GET returns 500", async () => {
    upsertLoanLedger({
      installed_app_id: install.installed_app_id,
      instance_id: install.instance_id,
      ledger_key: "loans_receivable",
      name: "Loans Receivable Ledger",
      blnk_ledger_id: "ldg_stored",
    });
    upsertLoanLedger({
      installed_app_id: install.installed_app_id,
      instance_id: install.instance_id,
      ledger_key: "accrued_interest",
      name: "Accrued Interest Ledger",
      blnk_ledger_id: "ldg_stored_interest",
    });
    upsertLoanLedger({
      installed_app_id: install.installed_app_id,
      instance_id: install.instance_id,
      ledger_key: "deferred_fee",
      name: "Deferred Fee Ledger",
      blnk_ledger_id: "ldg_stored_fee",
    });

    mockExistingLedgers({ detailGetStatus: 500 });

    const rows = await ensureLoanLedgers(install);
    const loansReceivable = rows.find((row) => row.ledger_key === "loans_receivable");

    assert.equal(loansReceivable?.blnk_ledger_id, "ldg_older");
    assert.equal(createCalls, 0);
  });

  it("serializes concurrent ensure calls for the same install", async () => {
    mockExistingLedgers();

    const [first, second] = await Promise.all([
      ensureLoanLedgers(install),
      ensureLoanLedgers(install),
    ]);

    assert.deepEqual(
      first.map((row) => row.blnk_ledger_id),
      second.map((row) => row.blnk_ledger_id)
    );
    assert.equal(createCalls, 0);
  });
});
