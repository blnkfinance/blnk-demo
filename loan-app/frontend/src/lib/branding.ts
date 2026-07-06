export const DEFAULT_BRANDING_PRIMARY_COLOR = "#0979C6";

export const BRANDING_STORAGE_PREFIX = "loan-app:branding:";
export const BRANDING_INSTALL_STORAGE_PREFIX = "loan-app:branding:install:";
export const BRANDING_LAST_INSTALL_KEY = "loan-app:branding:last-install-id";
export const BRANDING_COOKIE_NAME = "loan-app-branding-primary";

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export type BrandingPersistContext = {
  token?: string | null;
  installedAppId?: string | null;
};

export function resolveBrandingPrimaryColor(raw?: string): string {
  const value = raw?.trim();
  if (!value || !HEX_COLOR.test(value)) {
    return DEFAULT_BRANDING_PRIMARY_COLOR;
  }

  return value.toUpperCase();
}

export function isValidBrandingPrimaryColor(raw: string): boolean {
  return HEX_COLOR.test(raw.trim());
}

export function readBrandingPrimaryColorForRequest(
  cookieValue: string | undefined
): string {
  if (cookieValue && isValidBrandingPrimaryColor(cookieValue)) {
    return resolveBrandingPrimaryColor(cookieValue);
  }

  return DEFAULT_BRANDING_PRIMARY_COLOR;
}

export function brandingStorageKey(token: string): string {
  return `${BRANDING_STORAGE_PREFIX}${token}`;
}

export function brandingInstallStorageKey(installedAppId: string): string {
  return `${BRANDING_INSTALL_STORAGE_PREFIX}${installedAppId}`;
}

export function readCachedBrandingPrimaryColor(
  token?: string | null
): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  try {
    if (token) {
      const byToken = localStorage.getItem(brandingStorageKey(token));
      if (byToken && isValidBrandingPrimaryColor(byToken)) {
        return resolveBrandingPrimaryColor(byToken);
      }
    }

    const lastInstall = localStorage.getItem(BRANDING_LAST_INSTALL_KEY);
    if (lastInstall) {
      const byInstall = localStorage.getItem(
        brandingInstallStorageKey(lastInstall)
      );
      if (byInstall && isValidBrandingPrimaryColor(byInstall)) {
        return resolveBrandingPrimaryColor(byInstall);
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function persistBrandingPrimaryColor(
  color: string,
  context?: BrandingPersistContext
): void {
  const resolved = resolveBrandingPrimaryColor(color);

  if (typeof localStorage !== "undefined") {
    try {
      if (context?.token) {
        localStorage.setItem(brandingStorageKey(context.token), resolved);
      }

      if (context?.installedAppId) {
        localStorage.setItem(
          brandingInstallStorageKey(context.installedAppId),
          resolved
        );
        localStorage.setItem(BRANDING_LAST_INSTALL_KEY, context.installedAppId);
      }
    } catch {
      // ignore quota / private mode errors
    }
  }

  if (typeof document !== "undefined") {
    try {
      document.cookie = `${BRANDING_COOKIE_NAME}=${encodeURIComponent(resolved)}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // ignore cookie write errors
    }
  }
}

export function applyBrandingPrimaryColor(
  color: string,
  context?: BrandingPersistContext
): void {
  const resolved = resolveBrandingPrimaryColor(color);

  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty(
      "--platform-brand-primary",
      resolved
    );
  }

  if (context?.token || context?.installedAppId) {
    persistBrandingPrimaryColor(resolved, context);
  }
}

export const BRANDING_BOOTSTRAP_SCRIPT = `(function(){try{function a(c){document.documentElement.style.setProperty("--platform-brand-primary",c.toUpperCase())}function v(c){return/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c)}var cs=document.cookie.split(";");for(var i=0;i<cs.length;i++){var p=cs[i].trim();if(p.indexOf("${BRANDING_COOKIE_NAME}=")===0){var cc=decodeURIComponent(p.slice(${BRANDING_COOKIE_NAME.length + 1}));if(v(cc)){a(cc);return}}}var sp=new URLSearchParams(window.location.search);var t=sp.get("token");if(t){var bt=localStorage.getItem("${BRANDING_STORAGE_PREFIX}"+t);if(bt&&v(bt)){a(bt);return}}var li=localStorage.getItem("${BRANDING_LAST_INSTALL_KEY}");if(li){var bi=localStorage.getItem("${BRANDING_INSTALL_STORAGE_PREFIX}"+li);if(bi&&v(bi)){a(bi)}}}catch(e){}})();`;
