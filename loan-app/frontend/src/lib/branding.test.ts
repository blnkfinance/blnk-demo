import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BRANDING_COOKIE_NAME,
  BRANDING_INSTALL_STORAGE_PREFIX,
  BRANDING_LAST_INSTALL_KEY,
  BRANDING_STORAGE_PREFIX,
  DEFAULT_BRANDING_PRIMARY_COLOR,
  applyBrandingPrimaryColor,
  brandingStorageKey,
  persistBrandingPrimaryColor,
  readBrandingPrimaryColorForRequest,
  readCachedBrandingPrimaryColor,
  resolveBrandingPrimaryColor,
} from "./branding";

describe("branding storage", () => {
  it("stores and reads colour by portal token", () => {
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
      persistBrandingPrimaryColor("#FF0000", { token: "portal-token" });
      assert.equal(
        storage.get(`${BRANDING_STORAGE_PREFIX}portal-token`),
        "#FF0000"
      );
      assert.equal(readCachedBrandingPrimaryColor("portal-token"), "#FF0000");
      assert.equal(
        brandingStorageKey("portal-token"),
        `${BRANDING_STORAGE_PREFIX}portal-token`
      );
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: original,
      });
    }
  });

  it("falls back to the last install colour when the token cache misses", () => {
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
      persistBrandingPrimaryColor("#FF0000", {
        installedAppId: "inst_test",
      });
      assert.equal(
        storage.get(`${BRANDING_INSTALL_STORAGE_PREFIX}inst_test`),
        "#FF0000"
      );
      assert.equal(storage.get(BRANDING_LAST_INSTALL_KEY), "inst_test");
      assert.equal(readCachedBrandingPrimaryColor("new_string"), "#FF0000");
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: original,
      });
    }
  });

  it("reads the server branding colour from a valid cookie", () => {
    assert.equal(readBrandingPrimaryColorForRequest("#FF0000"), "#FF0000");
    assert.equal(readBrandingPrimaryColorForRequest(undefined), DEFAULT_BRANDING_PRIMARY_COLOR);
    assert.equal(readBrandingPrimaryColorForRequest("not-a-colour"), DEFAULT_BRANDING_PRIMARY_COLOR);
  });

  it("applies colour to document and persists when token is provided", () => {
    const storage = new Map<string, string>();
    const originalStorage = globalThis.localStorage;
    const originalDocument = globalThis.document;
    const setProperty = (key: string, value: string) => {
      storage.set(`style:${key}`, value);
    };

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
      },
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        cookie: "",
        documentElement: {
          style: { setProperty },
        },
      },
    });

    try {
      applyBrandingPrimaryColor("#aabbcc", { token: "portal-token" });

      assert.equal(storage.get("style:--platform-brand-primary"), "#AABBCC");
      assert.equal(
        storage.get(`${BRANDING_STORAGE_PREFIX}portal-token`),
        "#AABBCC"
      );
      assert.match(globalThis.document.cookie, new RegExp(`${BRANDING_COOKIE_NAME}=%23AABBCC`));
      assert.equal(resolveBrandingPrimaryColor("#aabbcc"), "#AABBCC");
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: originalStorage,
      });
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: originalDocument,
      });
    }
  });
});
