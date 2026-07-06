import type { InstallRow, LoanLedgerKey } from "../../db/index.js";
import { decryptSecret } from "../crypto.js";
import {
  assertInstallPermission,
  blnkDataGetJson,
} from "./cloudClient.js";

export type ResolvedLoanBalance = {
  balanceId: string;
  currency: string;
};

export type LoanBalanceSnapshot = ResolvedLoanBalance & {
  balance: number;
  creditBalance: number;
  debitBalance: number;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function balanceQueryFirstResult(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;
  const data = raw.data;
  if (!Array.isArray(data) || data.length === 0) return null;
  const row = data[0];
  return isRecord(row) ? row : null;
}

function parseBalanceNumberOrZero(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    return 0;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function mapResolvedLoanBalance(
  row: Record<string, unknown>,
  ledgerKey: LoanLedgerKey
): ResolvedLoanBalance {
  const balanceId = row.balance_id;
  const currency = row.currency;
  if (typeof balanceId !== "string" || balanceId.length === 0) {
    throw new Error(`Loan balance missing balance_id: ${ledgerKey}`);
  }
  if (typeof currency !== "string" || currency.length === 0) {
    throw new Error(`Loan balance missing currency: ${ledgerKey}`);
  }

  return { balanceId, currency };
}

function mapBalanceSnapshot(
  row: Record<string, unknown>,
  ledgerKey: LoanLedgerKey
): LoanBalanceSnapshot {
  return {
    ...mapResolvedLoanBalance(row, ledgerKey),
    balance: parseBalanceNumberOrZero(row.balance),
    creditBalance: parseBalanceNumberOrZero(row.credit_balance),
    debitBalance: parseBalanceNumberOrZero(row.debit_balance),
  };
}

async function fetchLoanBalanceRow(
  install: InstallRow,
  identityId: string,
  loanId: string,
  ledgerKey: LoanLedgerKey
): Promise<Record<string, unknown>> {
  assertInstallPermission(install, "data:read");
  const bearer = decryptSecret(install.api_key_encrypted);

  const raw = await blnkDataGetJson(bearer, "/data/balances", install.instance_id, {
    identity_id_eq: identityId,
    "meta_data.loan_id_eq": loanId,
    "meta_data.ledger_key_eq": ledgerKey,
    page: "1",
    pageSize: "1",
  });

  const row = balanceQueryFirstResult(raw);
  if (!row) {
    throw new Error(`Loan balance not found: ${ledgerKey} for loan ${loanId}`);
  }

  return row;
}

export async function fetchLoanBalanceSnapshot(
  install: InstallRow,
  identityId: string,
  loanId: string,
  ledgerKey: LoanLedgerKey
): Promise<LoanBalanceSnapshot> {
  const row = await fetchLoanBalanceRow(install, identityId, loanId, ledgerKey);
  return mapBalanceSnapshot(row, ledgerKey);
}

export async function resolveLoanBalance(
  install: InstallRow,
  identityId: string,
  loanId: string,
  ledgerKey: LoanLedgerKey
): Promise<ResolvedLoanBalance> {
  const row = await fetchLoanBalanceRow(install, identityId, loanId, ledgerKey);
  return mapResolvedLoanBalance(row, ledgerKey);
}
