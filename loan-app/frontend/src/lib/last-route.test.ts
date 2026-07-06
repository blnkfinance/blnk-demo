import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getLastRoute, isRestorableRoute, saveLastRoute } from "./last-route";

const DEFAULT_ROUTE = "/loans?status=approved";

describe("isRestorableRoute", () => {
  it("allows app routes", () => {
    assert.equal(isRestorableRoute("/loans"), true);
    assert.equal(isRestorableRoute("/loans/loan_abc"), true);
    assert.equal(isRestorableRoute("/products"), true);
    assert.equal(isRestorableRoute("/settings"), true);
    assert.equal(isRestorableRoute("/loans?status=approved"), true);
  });

  it("rejects portal and external paths", () => {
    assert.equal(isRestorableRoute("/portal"), false);
    assert.equal(isRestorableRoute("/"), false);
    assert.equal(isRestorableRoute("/cloud/transactions"), false);
  });
});

describe("last route storage", () => {
  it("persists and restores a restorable route", () => {
    const storage = new Map<string, string>();
    const original = globalThis.localStorage;

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
      },
    });

    try {
      saveLastRoute("/portal");
      assert.equal(getLastRoute(), DEFAULT_ROUTE);

      saveLastRoute("/loans/loan_abc");
      assert.equal(getLastRoute(), "/loans/loan_abc");

      saveLastRoute("/loans", "?status=approved");
      assert.equal(getLastRoute(), "/loans?status=approved");
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: original,
      });
    }
  });
});
