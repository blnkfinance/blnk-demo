import {
  getLoanLedgerByKey,
  type InstallRow,
  type LoanLedgerKey,
} from "../../db/index.js";
import { decryptSecret } from "../crypto.js";
import {
  assertInstallPermission,
  blnkProxyPostJson,
  blnkRequireId,
} from "./cloudClient.js";
import { ensureLoanLedgers } from "./loanLedgers.js";

const LOAN_BALANCE_LEDGER_KEYS: LoanLedgerKey[] = [
  "loans_receivable",
  "deferred_fee",
  "accrued_interest",
];

export type LoanBalanceIds = {
  loansReceivableBalanceId: string;
  deferredFeeBalanceId: string;
  accruedInterestBalanceId: string;
};

function loanBalanceMetaData(
  loanId: string,
  ledgerKey: LoanLedgerKey
): Record<string, string> {
  return {
    managed_by: "loan-app",
    loan_id: loanId,
    ledger_key: ledgerKey,
  };
}

async function createOneLoanBalance(
  bearer: string,
  instanceId: string,
  ledgerId: string,
  identityId: string,
  currency: string,
  loanId: string,
  ledgerKey: LoanLedgerKey
): Promise<string> {
  const raw = await blnkProxyPostJson(bearer, "/proxy/balances", instanceId, {
    ledger_id: ledgerId,
    identity_id: identityId,
    currency,
    meta_data: loanBalanceMetaData(loanId, ledgerKey),
  });
  return blnkRequireId(raw, "balance_id");
}

export async function createLoanBalances(
  install: InstallRow,
  input: { loanId: string; identityId: string; currency: string }
): Promise<LoanBalanceIds> {
  assertInstallPermission(install, "data:write");
  await ensureLoanLedgers(install);

  const bearer = decryptSecret(install.api_key_encrypted);
  const { loanId, identityId, currency } = input;

  const balanceIds: Partial<Record<LoanLedgerKey, string>> = {};

  for (const ledgerKey of LOAN_BALANCE_LEDGER_KEYS) {
    const ledger = getLoanLedgerByKey(install.installed_app_id, ledgerKey);
    if (!ledger) {
      throw new Error(`Loan ledger not configured: ${ledgerKey}`);
    }

    balanceIds[ledgerKey] = await createOneLoanBalance(
      bearer,
      install.instance_id,
      ledger.blnk_ledger_id,
      identityId,
      currency,
      loanId,
      ledgerKey
    );
  }

  return {
    loansReceivableBalanceId: balanceIds.loans_receivable!,
    deferredFeeBalanceId: balanceIds.deferred_fee!,
    accruedInterestBalanceId: balanceIds.accrued_interest!,
  };
}
