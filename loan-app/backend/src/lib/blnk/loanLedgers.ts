import {
  getLoanLedgerByKey,
  listLoanLedgers,
  type InstallRow,
  type LoanLedgerKey,
  type LoanLedgerRow,
  upsertLoanLedger,
} from "../../db/index.js";
import { decryptSecret } from "../crypto.js";
import {
  assertInstallPermission,
  blnkDataGetJson,
  blnkProxyPostJson,
  blnkRequireId,
} from "./cloudClient.js";

export const LOAN_LEDGER_DEFINITIONS: { ledger_key: LoanLedgerKey; name: string }[] = [
  { ledger_key: "loans_receivable", name: "Loans Receivable Ledger" },
  { ledger_key: "accrued_interest", name: "Accrued Interest Ledger" },
  { ledger_key: "deferred_fee", name: "Deferred Fee Ledger" },
];

const LOAN_LEDGER_META_BASE = {
  product: "Loan Management",
  managed_by: "loan-app",
} as const;

function loanLedgerMetaData(ledgerKey: LoanLedgerKey): Record<string, string> {
  return {
    ...LOAN_LEDGER_META_BASE,
    ledger_key: ledgerKey,
  };
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && /\(\s*404\s*\)/.test(err.message);
}

function isServerError(err: unknown): boolean {
  return err instanceof Error && /\(\s*5\d{2}\s*\)/.test(err.message);
}

async function blnkGetLedgerById(
  bearer: string,
  ledgerId: string,
  instanceId: string
): Promise<Record<string, unknown> | null> {
  try {
    const raw = await blnkDataGetJson(
      bearer,
      `/data/ledgers/${encodeURIComponent(ledgerId)}`,
      instanceId
    );
    return isRecord(raw) ? raw : null;
  } catch (err) {
    // Detail GET can 404 or 500 while list/filter queries still work — fall through to discovery.
    if (isNotFoundError(err) || isServerError(err)) return null;
    throw err;
  }
}

function parseLedgerList(raw: unknown): Record<string, unknown>[] {
  if (!isRecord(raw)) return [];
  const data = raw.data;
  if (!Array.isArray(data)) return [];
  return data.filter(isRecord);
}

function pickOldestLedger(
  ledgers: Record<string, unknown>[]
): Record<string, unknown> | null {
  if (ledgers.length === 0) return null;

  const sorted = [...ledgers].sort((a, b) => {
    const aTime = typeof a.created_at === "string" ? a.created_at : "";
    const bTime = typeof b.created_at === "string" ? b.created_at : "";
    return aTime.localeCompare(bTime);
  });

  return sorted[0] ?? null;
}

async function blnkFindLoanLedgerByKey(
  bearer: string,
  ledgerKey: LoanLedgerKey,
  instanceId: string
): Promise<Record<string, unknown> | null> {
  const raw = await blnkDataGetJson(bearer, "/data/ledgers", instanceId, {
    "meta_data.managed_by_eq": LOAN_LEDGER_META_BASE.managed_by,
    "meta_data.ledger_key_eq": ledgerKey,
    page: "1",
    pageSize: "30",
  });

  return pickOldestLedger(parseLedgerList(raw));
}

async function blnkFindLedgerByName(
  bearer: string,
  name: string,
  instanceId: string
): Promise<Record<string, unknown> | null> {
  const raw = await blnkDataGetJson(bearer, "/data/ledgers", instanceId, {
    name_eq: name,
    page: "1",
    pageSize: "30",
  });

  const matches = parseLedgerList(raw).filter(
    (row) => typeof row.name === "string" && row.name === name
  );
  return pickOldestLedger(matches);
}

async function blnkCreateLedger(
  bearer: string,
  name: string,
  ledgerKey: LoanLedgerKey,
  instanceId: string
): Promise<string> {
  const raw = await blnkProxyPostJson(bearer, "/proxy/ledgers", instanceId, {
    name,
    meta_data: loanLedgerMetaData(ledgerKey),
  });
  return blnkRequireId(raw, "ledger_id");
}

function storedLedgerMatchesInstall(
  row: LoanLedgerRow | undefined,
  install: InstallRow
): row is LoanLedgerRow {
  return (
    row !== undefined &&
    row.instance_id === install.instance_id &&
    row.blnk_ledger_id.length > 0
  );
}

function upsertLoanLedgerForInstall(
  install: InstallRow,
  ledgerKey: LoanLedgerKey,
  name: string,
  blnkLedgerId: string
): LoanLedgerRow {
  return upsertLoanLedger({
    installed_app_id: install.installed_app_id,
    instance_id: install.instance_id,
    ledger_key: ledgerKey,
    name,
    blnk_ledger_id: blnkLedgerId,
  });
}

async function ensureOneLoanLedger(
  install: InstallRow,
  bearer: string,
  definition: (typeof LOAN_LEDGER_DEFINITIONS)[number]
): Promise<LoanLedgerRow> {
  const existing = getLoanLedgerByKey(install.installed_app_id, definition.ledger_key);

  if (storedLedgerMatchesInstall(existing, install)) {
    const byId = await blnkGetLedgerById(
      bearer,
      existing.blnk_ledger_id,
      install.instance_id
    );
    if (byId) {
      return existing;
    }
  }

  const byKey = await blnkFindLoanLedgerByKey(
    bearer,
    definition.ledger_key,
    install.instance_id
  );
  if (byKey) {
    const ledgerId = blnkRequireId(byKey, "ledger_id");
    const name =
      typeof byKey.name === "string" && byKey.name.length > 0
        ? byKey.name
        : definition.name;
    return upsertLoanLedgerForInstall(
      install,
      definition.ledger_key,
      name,
      ledgerId
    );
  }

  const byName = await blnkFindLedgerByName(bearer, definition.name, install.instance_id);
  if (byName) {
    const ledgerId = blnkRequireId(byName, "ledger_id");
    const name =
      typeof byName.name === "string" && byName.name.length > 0
        ? byName.name
        : definition.name;
    return upsertLoanLedgerForInstall(
      install,
      definition.ledger_key,
      name,
      ledgerId
    );
  }

  assertInstallPermission(install, "data:write");
  const ledgerId = await blnkCreateLedger(
    bearer,
    definition.name,
    definition.ledger_key,
    install.instance_id
  );
  return upsertLoanLedgerForInstall(
    install,
    definition.ledger_key,
    definition.name,
    ledgerId
  );
}

const ensureLoanLedgersLocks = new Map<string, Promise<LoanLedgerRow[]>>();

async function ensureLoanLedgersUnlocked(install: InstallRow): Promise<LoanLedgerRow[]> {
  assertInstallPermission(install, "data:read");
  const bearer = decryptSecret(install.api_key_encrypted);

  const rows: LoanLedgerRow[] = [];
  for (const definition of LOAN_LEDGER_DEFINITIONS) {
    rows.push(await ensureOneLoanLedger(install, bearer, definition));
  }
  return rows;
}

export async function ensureLoanLedgers(install: InstallRow): Promise<LoanLedgerRow[]> {
  const inFlight = ensureLoanLedgersLocks.get(install.installed_app_id);
  if (inFlight) return inFlight;

  const promise = ensureLoanLedgersUnlocked(install);
  ensureLoanLedgersLocks.set(install.installed_app_id, promise);

  try {
    return await promise;
  } finally {
    ensureLoanLedgersLocks.delete(install.installed_app_id);
  }
}

export function getLoanLedgersForInstall(installedAppId: string): LoanLedgerRow[] {
  return listLoanLedgers(installedAppId);
}

/** Settings display: known ledger types with IDs from SQLite only (no Omni call). */
export function listLoanLedgersForSettings(
  installedAppId: string
): LoanLedgerResponse[] {
  const stored = listLoanLedgers(installedAppId);
  const byKey = new Map(stored.map((row) => [row.ledger_key, row]));

  return LOAN_LEDGER_DEFINITIONS.map((definition) => {
    const row = byKey.get(definition.ledger_key);
    return {
      ledger_key: definition.ledger_key,
      name: row?.name ?? definition.name,
      blnk_ledger_id: row?.blnk_ledger_id ?? "",
    };
  });
}

export type LoanLedgerResponse = {
  ledger_key: LoanLedgerKey;
  name: string;
  blnk_ledger_id: string;
};

export function toLoanLedgerResponse(row: LoanLedgerRow): LoanLedgerResponse {
  return {
    ledger_key: row.ledger_key,
    name: row.name,
    blnk_ledger_id: row.blnk_ledger_id,
  };
}
