import {
  getLoanEligibilitySettings,
  type InstallRow,
  type LoanBookType,
} from "../../db/index.js";
import { decryptSecret } from "../crypto.js";
import { assertInstallPermission, blnkDataGetJson } from "./cloudClient.js";

export const LOAN_ELIGIBILITY_INELIGIBLE_MESSAGE =
  "This customer is not qualified to apply for a loan.";

export type LoanEligibilityResult =
  | { eligible: true }
  | { eligible: false; message: string };

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function balanceQueryHasResults(raw: unknown): boolean {
  if (!isRecord(raw)) return false;
  if (typeof raw.total === "number" && raw.total > 0) return true;
  const data = raw.data;
  return Array.isArray(data) && data.length > 0;
}

async function identityHasBalanceInBook(
  install: InstallRow,
  bearer: string,
  identityId: string,
  book: LoanBookType
): Promise<boolean> {
  const raw = await blnkDataGetJson(bearer, "/data/balances", install.instance_id, {
    identity_id_eq: identityId,
    "meta_data.book_eq": book,
    page: "1",
    pageSize: "1",
  });
  return balanceQueryHasResults(raw);
}

export async function checkIdentityLoanEligibility(
  install: InstallRow,
  identityId: string
): Promise<LoanEligibilityResult> {
  const { allowed_books } = getLoanEligibilitySettings(install.installed_app_id);
  assertInstallPermission(install, "data:read");
  const bearer = decryptSecret(install.api_key_encrypted);

  for (const book of allowed_books) {
    if (await identityHasBalanceInBook(install, bearer, identityId, book)) {
      return { eligible: true };
    }
  }

  return {
    eligible: false,
    message: LOAN_ELIGIBILITY_INELIGIBLE_MESSAGE,
  };
}
