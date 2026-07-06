import { backendFetch } from "../backend-client";
import type {
  BrandingSettings,
  LoanEligibilitySettings,
  LoanLedgersResponse,
} from "./types";

type ApiErrorBody = { ok?: false; error?: string };

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function appendToken(path: string, token: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}token=${encodeURIComponent(token)}`;
}

export async function fetchLoanLedgers(token: string): Promise<
  | { ok: true; ledgers: LoanLedgersResponse["ledgers"] }
  | { ok: false; status: number; message: string }
> {
  const response = await backendFetch(appendToken("/settings/ledgers", token));
  const body = await parseJson<LoanLedgersResponse & ApiErrorBody>(response);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: body?.error ?? "Failed to load ledgers",
    };
  }

  if (!body?.ledgers) {
    return {
      ok: false,
      status: response.status,
      message: "Invalid ledger response",
    };
  }

  return { ok: true, ledgers: body.ledgers };
}

export async function ensureLoanLedgers(token: string): Promise<
  | { ok: true; ledgers: LoanLedgersResponse["ledgers"] }
  | { ok: false; status: number; message: string }
> {
  const response = await backendFetch(
    appendToken("/settings/ledgers/ensure", token),
    { method: "POST", headers: { "Content-Type": "application/json" } }
  );
  const body = await parseJson<LoanLedgersResponse & ApiErrorBody>(response);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: body?.error ?? "Failed to set up ledgers",
    };
  }

  if (!body?.ledgers) {
    return {
      ok: false,
      status: response.status,
      message: "Invalid ledger response",
    };
  }

  return { ok: true, ledgers: body.ledgers };
}

export async function fetchLoanEligibilitySettings(token: string): Promise<
  | { ok: true; settings: LoanEligibilitySettings }
  | { ok: false; status: number; message: string }
> {
  const response = await backendFetch(
    appendToken("/settings/loan-eligibility", token)
  );
  const body = await parseJson<LoanEligibilitySettings & ApiErrorBody>(response);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: body?.error ?? "Failed to load loan eligibility settings",
    };
  }

  if (!body?.allowed_books || !Array.isArray(body.allowed_books)) {
    return {
      ok: false,
      status: response.status,
      message: "Invalid loan eligibility response",
    };
  }

  return { ok: true, settings: { allowed_books: body.allowed_books } };
}

export async function patchLoanEligibilitySettings(
  token: string,
  settings: LoanEligibilitySettings
): Promise<
  | { ok: true; settings: LoanEligibilitySettings }
  | { ok: false; status: number; message: string }
> {
  const response = await backendFetch(
    appendToken("/settings/loan-eligibility", token),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }
  );
  const body = await parseJson<LoanEligibilitySettings & ApiErrorBody>(response);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: body?.error ?? "Failed to update loan eligibility settings",
    };
  }

  if (!body?.allowed_books || !Array.isArray(body.allowed_books)) {
    return {
      ok: false,
      status: response.status,
      message: "Invalid loan eligibility response",
    };
  }

  return { ok: true, settings: { allowed_books: body.allowed_books } };
}

export async function fetchBrandingSettings(token: string): Promise<
  | { ok: true; settings: BrandingSettings }
  | { ok: false; status: number; message: string }
> {
  const response = await backendFetch(appendToken("/settings/branding", token));
  const body = await parseJson<BrandingSettings & ApiErrorBody>(response);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: body?.error ?? "Failed to load branding settings",
    };
  }

  if (!body?.primary_color || typeof body.primary_color !== "string") {
    return {
      ok: false,
      status: response.status,
      message: "Invalid branding response",
    };
  }

  return { ok: true, settings: { primary_color: body.primary_color } };
}

export async function patchBrandingSettings(
  token: string,
  settings: BrandingSettings
): Promise<
  | { ok: true; settings: BrandingSettings }
  | { ok: false; status: number; message: string }
> {
  const response = await backendFetch(appendToken("/settings/branding", token), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  const body = await parseJson<BrandingSettings & ApiErrorBody>(response);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: body?.error ?? "Failed to update branding settings",
    };
  }

  if (!body?.primary_color || typeof body.primary_color !== "string") {
    return {
      ok: false,
      status: response.status,
      message: "Invalid branding response",
    };
  }

  return { ok: true, settings: { primary_color: body.primary_color } };
}
