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
  upsertLoanEligibilitySettings,
  type InstallRow,
} from "../../db/index.js";
import { encryptSecret } from "../crypto.js";
import { resetEnvForTests } from "../env.js";
import {
  LOAN_ELIGIBILITY_INELIGIBLE_MESSAGE,
  checkIdentityLoanEligibility,
} from "./loanEligibility.js";

const TEST_ENCRYPTION_KEY = "a".repeat(64);
const ELENA_ID = "idt_86173b9a-4682-4d30-b984-628f81a7693c";

let tempDir: string;
let install: InstallRow;
let fetchMock: ReturnType<typeof mock.method>;

function setupTestEnv(): void {
  resetDbForTests();
  resetEnvForTests();
  tempDir = mkdtempSync(path.join(tmpdir(), "loan-eligibility-test-"));
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
    granted_permissions: ["data:read"],
    status: "active",
    idempotency_key: "install:eligibility-test",
  });

  install = findInstallById("inst_test")!;
}

function mockBalanceBookResponses(
  booksByIdentity: Record<string, Partial<Record<"a_book" | "b_book" | "justo", number>>>
): void {
  fetchMock = mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (!url.includes("/data/balances")) {
      return new Response(JSON.stringify({ ok: false }), { status: 404 });
    }

    const parsed = new URL(url);
    const identityId = parsed.searchParams.get("identity_id_eq") ?? "";
    const book = parsed.searchParams.get("meta_data.book_eq") as
      | "a_book"
      | "b_book"
      | "justo"
      | null;
    const total = book ? (booksByIdentity[identityId]?.[book] ?? 0) : 0;

    return new Response(
      JSON.stringify({
        data: total > 0 ? [{ balance_id: "bln_test" }] : [],
        total,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  });
}

describe("checkIdentityLoanEligibility", () => {
  before(() => {
    setupTestEnv();
  });

  after(() => {
    fetchMock?.mock.restore();
    resetDbForTests();
    resetEnvForTests();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns eligible when identity has an allowed a_book balance", async () => {
    mockBalanceBookResponses({ [ELENA_ID]: { a_book: 1, b_book: 0 } });

    const result = await checkIdentityLoanEligibility(install, ELENA_ID);

    assert.deepEqual(result, { eligible: true });
  });

  it("returns ineligible when identity has no balance in allowed books", async () => {
    mockBalanceBookResponses({ [ELENA_ID]: { a_book: 0, b_book: 0, justo: 0 } });

    const result = await checkIdentityLoanEligibility(install, ELENA_ID);

    assert.deepEqual(result, {
      eligible: false,
      message: LOAN_ELIGIBILITY_INELIGIBLE_MESSAGE,
    });
  });

  it("uses default a_book setting when no row is stored", async () => {
    mockBalanceBookResponses({ [ELENA_ID]: { a_book: 1 } });

    const result = await checkIdentityLoanEligibility(install, ELENA_ID);

    assert.equal(result.eligible, true);
  });

  it("respects custom allowed_books settings", async () => {
    upsertLoanEligibilitySettings({
      installed_app_id: install.installed_app_id,
      allowed_books: ["b_book"],
    });
    mockBalanceBookResponses({ [ELENA_ID]: { a_book: 1, b_book: 0 } });

    const result = await checkIdentityLoanEligibility(install, ELENA_ID);

    assert.deepEqual(result, {
      eligible: false,
      message: LOAN_ELIGIBILITY_INELIGIBLE_MESSAGE,
    });

    fetchMock.mock.restore();
    mockBalanceBookResponses({ [ELENA_ID]: { b_book: 1 } });

    const eligible = await checkIdentityLoanEligibility(install, ELENA_ID);
    assert.equal(eligible.eligible, true);
  });
});
