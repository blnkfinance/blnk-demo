const BANK_API =
  process.env.MOCK_BANK_API_URL ??
  process.env.NEXT_PUBLIC_MOCK_BANK_API_URL ??
  "http://localhost:8081";

/** Browser-facing bank API base (never the Docker-internal hostname). */
export function getPublicBankApiBase() {
  return process.env.NEXT_PUBLIC_MOCK_BANK_API_URL ?? "http://localhost:8081";
}

/** Server-side bank API base (may be http://mock-bank:8081 inside Compose). */
export function getBankApiBase() {
  return BANK_API;
}

async function bankFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BANK_API}/mock-bank${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.error === "string" ? body.error : `Bank API ${res.status}: ${path}`
    );
  }

  return res.json() as Promise<T>;
}

export const bankApi = {
  get: <T>(path: string) => bankFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    bankFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
};

export function formatNGN(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function nairaToKobo(naira: string): number {
  const value = Number.parseFloat(naira.replace(/,/g, "").trim());
  if (!Number.isFinite(value) || value < 0) throw new Error("Invalid amount");
  return Math.round(value * 100);
}

export type BankAccount = {
  id: string;
  account_number: string;
  account_name: string;
  balance: number;
  account_type: string;
  created_at: string;
};

export type Transfer = {
  id: string;
  bank_transaction_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  narration: string;
  transaction_date: string;
  status: string;
};

export type ActionState = {
  error?: string;
  success?: string;
};
