import type { InstallRow } from "../../db/index.js";
import { decryptSecret } from "../crypto.js";
import { assertInstallPermission, blnkFilterPostJson } from "./cloudClient.js";

export type LoanLedgerTransactionKind = "interest_accrual" | "principal_repayment";

export type LoanLedgerTransaction = {
  transaction_id: string;
  amount: number;
  currency: string;
  created_at: string;
  reference: string | null;
  period: number | null;
  accrual_date: string | null;
};

export type LoanLedgerTransactionsPage = {
  transactions: LoanLedgerTransaction[];
  total: number;
  page: number;
  pageSize: number;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function parseAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function parseOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseOptionalPeriod(meta: Record<string, unknown>): number | null {
  const period = meta.period;
  if (typeof period === "number" && Number.isFinite(period)) {
    return period;
  }
  if (typeof period === "string" && period.length > 0) {
    const parsed = Number(period);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mapLoanLedgerTransaction(row: Record<string, unknown>): LoanLedgerTransaction | null {
  const transactionId = row.transaction_id;
  const createdAt = row.created_at;
  if (typeof transactionId !== "string" || transactionId.length === 0) {
    return null;
  }
  if (typeof createdAt !== "string" || createdAt.length === 0) {
    return null;
  }

  const meta = isRecord(row.meta_data) ? row.meta_data : {};
  const currency = row.currency;
  const amount = row.amount ?? row.precise_amount;

  return {
    transaction_id: transactionId,
    amount: parseAmount(amount),
    currency: typeof currency === "string" ? currency : "",
    created_at: createdAt,
    reference: parseOptionalString(row.reference),
    period: parseOptionalPeriod(meta),
    accrual_date: parseOptionalString(meta.accrual_date),
  };
}

function filtersForKind(
  loanId: string,
  kind: LoanLedgerTransactionKind
): Array<{ field: string; operator: string; value: string }> {
  const base = [
    { field: "meta_data.loan_id", operator: "eq", value: loanId },
    { field: "meta_data.transaction_type", operator: "eq", value: "loan_repayment" },
  ];

  if (kind === "interest_accrual") {
    return [
      { field: "meta_data.loan_id", operator: "eq", value: loanId },
      { field: "meta_data.transaction_type", operator: "eq", value: "interest_accrual" },
    ];
  }

  return [
    ...base,
    { field: "meta_data.repayment_leg", operator: "eq", value: "principal" },
  ];
}

export async function listLoanLedgerTransactions(
  install: InstallRow,
  loanId: string,
  kind: LoanLedgerTransactionKind,
  page = 1,
  pageSize = 50
): Promise<LoanLedgerTransactionsPage> {
  assertInstallPermission(install, "data:read");
  const bearer = decryptSecret(install.api_key_encrypted);

  const raw = await blnkFilterPostJson(
    bearer,
    "/transactions/filter",
    install.instance_id,
    { filters: filtersForKind(loanId, kind) },
    {
      page: String(page),
      pageSize: String(pageSize),
    }
  );

  if (!isRecord(raw) || !Array.isArray(raw.data)) {
    throw new Error("Omni transactions filter response missing data array");
  }

  const transactions = raw.data
    .filter(isRecord)
    .map(mapLoanLedgerTransaction)
    .filter((row): row is LoanLedgerTransaction => row != null)
    .sort((a, b) => {
      const aDate = a.accrual_date ?? a.created_at;
      const bDate = b.accrual_date ?? b.created_at;
      return aDate.localeCompare(bDate);
    });

  const total = typeof raw.total === "number" ? raw.total : transactions.length;

  return {
    transactions,
    total,
    page,
    pageSize,
  };
}
