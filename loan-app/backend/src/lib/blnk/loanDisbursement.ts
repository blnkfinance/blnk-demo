import type { InstallRow, LoanBookType } from "../../db/index.js";
import { decryptSecret } from "../crypto.js";
import {
  assertInstallPermission,
  blnkDataGetJson,
  blnkProxyPostJson,
  blnkProxyPutJson,
} from "./cloudClient.js";

const BOOK_PRIORITY: LoanBookType[] = ["a_book", "b_book", "justo"];

export type DisbursementBalance = {
  balanceId: string;
  currency: string;
  book: LoanBookType;
};

export type LoanDisbursementMeta = {
  loanId: string;
  loanProductId: string;
  principal: number;
  originationFee: number;
  netDisbursement: number;
  termPeriods: number;
  firstPaymentDate: string;
  annualRateBps: number;
  effectiveAnnualRateBps: number;
  paymentFrequency: string;
  amortizationType: string;
  disbursementBook?: LoanBookType;
};

export type CreateDisbursementInflightParams = {
  currency: string;
  loansReceivableBalanceId: string;
  deferredFeeBalanceId: string;
  disbursementBalanceId: string;
  loan: LoanDisbursementMeta;
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

function extractCurrency(row: Record<string, unknown>): string | null {
  const currency = row.currency;
  return typeof currency === "string" && currency.length > 0 ? currency : null;
}

function extractBalanceId(row: Record<string, unknown>): string | null {
  const balanceId = row.balance_id;
  return typeof balanceId === "string" && balanceId.length > 0 ? balanceId : null;
}

function orderedAllowedBooks(allowedBooks: LoanBookType[]): LoanBookType[] {
  const allowed = new Set(allowedBooks);
  return BOOK_PRIORITY.filter((book) => allowed.has(book));
}

export async function resolveDisbursementBalance(
  install: InstallRow,
  identityId: string,
  allowedBooks: LoanBookType[]
): Promise<DisbursementBalance> {
  assertInstallPermission(install, "data:read");
  const bearer = decryptSecret(install.api_key_encrypted);

  for (const book of orderedAllowedBooks(allowedBooks)) {
    const raw = await blnkDataGetJson(bearer, "/data/balances", install.instance_id, {
      identity_id_eq: identityId,
      "meta_data.book_eq": book,
      page: "1",
      pageSize: "1",
    });

    const row = balanceQueryFirstResult(raw);
    if (!row) continue;

    const balanceId = extractBalanceId(row);
    const currency = extractCurrency(row);
    if (!balanceId || !currency) continue;

    return { balanceId, currency, book };
  }

  throw new Error("No eligible customer cash balance found for disbursement.");
}

function extractQueuedParentTransaction(raw: unknown): string {
  if (!isRecord(raw)) {
    throw new Error("Omni transaction response missing QUEUED_PARENT_TRANSACTION");
  }

  const meta = raw.meta_data;
  if (isRecord(meta)) {
    const queuedParent = meta.QUEUED_PARENT_TRANSACTION;
    if (typeof queuedParent === "string" && queuedParent.length > 0) {
      return queuedParent;
    }
  }

  const transactionId = raw.transaction_id;
  if (typeof transactionId === "string" && transactionId.length > 0) {
    return transactionId;
  }

  throw new Error("Omni transaction response missing QUEUED_PARENT_TRANSACTION");
}

export function buildLoanDisbursementMetadata(
  loan: LoanDisbursementMeta
): Record<string, string> {
  const metadata: Record<string, string> = {
    managed_by: "loan-app",
    transaction_type: "loan_disbursement",
    loan_id: loan.loanId,
    loan_product_id: loan.loanProductId,
    principal: String(loan.principal),
    origination_fee: String(loan.originationFee),
    net_disbursement: String(loan.netDisbursement),
    term_periods: String(loan.termPeriods),
    first_payment_date: loan.firstPaymentDate,
    annual_rate_bps: String(loan.annualRateBps),
    effective_annual_rate_bps: String(loan.effectiveAnnualRateBps),
    payment_frequency: loan.paymentFrequency,
    amortization_type: loan.amortizationType,
  };

  if (loan.disbursementBook) {
    metadata.disbursement_book = loan.disbursementBook;
  }

  return metadata;
}

export async function createDisbursementInflight(
  install: InstallRow,
  params: CreateDisbursementInflightParams
): Promise<string> {
  assertInstallPermission(install, "data:write");
  const bearer = decryptSecret(install.api_key_encrypted);
  const { loan } = params;

  const destinations: Record<string, unknown>[] = [
    {
      identifier: params.disbursementBalanceId,
      precise_distribution: String(loan.netDisbursement),
    },
  ];

  if (loan.originationFee > 0) {
    destinations.push({
      identifier: params.deferredFeeBalanceId,
      precise_distribution: String(loan.originationFee),
    });
  }

  const raw = await blnkProxyPostJson(
    bearer,
    "/proxy/transactions",
    install.instance_id,
    {
      precise_amount: loan.principal,
      currency: params.currency,
      source: params.loansReceivableBalanceId,
      description: `Loan disbursement ${loan.loanId}`,
      reference: loan.loanId,
      inflight: true,
      allow_overdraft: true,
      meta_data: buildLoanDisbursementMetadata(loan),
      destinations,
    }
  );

  return extractQueuedParentTransaction(raw);
}

export async function commitInflightTransaction(
  install: InstallRow,
  blnkTransaction: string
): Promise<void> {
  assertInstallPermission(install, "data:write");
  const bearer = decryptSecret(install.api_key_encrypted);

  await blnkProxyPutJson(
    bearer,
    `/proxy/transactions/inflight/${encodeURIComponent(blnkTransaction)}`,
    install.instance_id,
    { status: "commit", skip_queue: true }
  );
}

export async function voidInflightTransaction(
  install: InstallRow,
  blnkTransaction: string
): Promise<void> {
  assertInstallPermission(install, "data:write");
  const bearer = decryptSecret(install.api_key_encrypted);

  await blnkProxyPutJson(
    bearer,
    `/proxy/transactions/inflight/${encodeURIComponent(blnkTransaction)}`,
    install.instance_id,
    { status: "void", skip_queue: true }
  );
}
