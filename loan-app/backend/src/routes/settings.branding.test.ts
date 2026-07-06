import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Response } from "express";
import { after, before, describe, it } from "node:test";
import {
  createPortalSession,
  findInstallById,
  findPortalSessionRow,
  getBrandingSettings,
  getDb,
  insertActiveInstall,
  resetDbForTests,
} from "../db/index.js";
import { DEFAULT_BRANDING_PRIMARY_COLOR } from "../lib/branding.js";
import { encryptSecret } from "../lib/crypto.js";
import { resetEnvForTests } from "../lib/env.js";
import type { PortalAuthedRequest } from "../lib/requirePortalAuth.js";
import {
  getBrandingSettingsHandler,
  patchBrandingSettingsHandler,
} from "./settings.js";

const TEST_ENCRYPTION_KEY = "a".repeat(64);
let tempDir: string;
let portalToken: string;

type MockResponse = Response & {
  statusCode: number;
  body: unknown;
};

function setupTestEnv(): void {
  resetDbForTests();
  resetEnvForTests();
  tempDir = mkdtempSync(path.join(tmpdir(), "loan-app-branding-settings-test-"));
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

describe("branding settings routes", () => {
  before(() => {
    setupTestEnv();
  });

  after(() => {
    resetDbForTests();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns the default primary colour when no row exists", () => {
    const res = mockResponse();
    getBrandingSettingsHandler(mockRequest({}), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      primary_color: DEFAULT_BRANDING_PRIMARY_COLOR,
    });
  });

  it("persists a valid primary colour", () => {
    const res = mockResponse();
    patchBrandingSettingsHandler(
      mockRequest({ primary_color: "#FF3C38" }),
      res
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { primary_color: "#FF3C38" });

    const stored = getBrandingSettings("inst_test");
    assert.equal(stored.primary_color, "#FF3C38");
  });

  it("rejects an invalid primary colour", () => {
    const res = mockResponse();
    patchBrandingSettingsHandler(
      mockRequest({ primary_color: "not-a-colour" }),
      res
    );

    assert.equal(res.statusCode, 400);
    const body = res.body as { ok: false; field_errors?: Record<string, string> };
    assert.equal(body.ok, false);
    assert.ok(body.field_errors?.primary_color);
  });
});
