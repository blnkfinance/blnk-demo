const STORAGE_KEY = "loan-app:last-route";

const RESTORABLE_PREFIXES = ["/loans", "/products", "/settings"] as const;

const DEFAULT_ROUTE = "/loans?status=approved";

export function isRestorableRoute(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return RESTORABLE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

export function saveLastRoute(pathname: string, search = ""): void {
  const path =
    search && pathname === "/loans" ? `${pathname}${search}` : pathname;

  if (!isRestorableRoute(path)) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, path);
  } catch {
    // ignore quota / private mode / SSR errors
  }
}

export function getLastRoute(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isRestorableRoute(saved)) {
      return saved;
    }
  } catch {
    // ignore read errors
  }

  return DEFAULT_ROUTE;
}
