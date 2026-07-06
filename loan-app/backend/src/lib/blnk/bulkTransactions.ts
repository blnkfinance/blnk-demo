import type { InstallRow } from "../../db/index.js";
import { decryptSecret } from "../crypto.js";
import {
  assertInstallPermission,
  blnkProxyPostJson,
} from "./cloudClient.js";

export type BlnkTransactionItem = Record<string, unknown>;

export function normalizeTransactionItem(item: BlnkTransactionItem): BlnkTransactionItem {
  return {
    precision: 100,
    ...item,
  };
}

/** Post each transaction via POST /proxy/transactions, in order. */
export async function postTransactionsSequentially(
  install: InstallRow,
  transactions: BlnkTransactionItem[]
): Promise<{ transactionCount: number }> {
  assertInstallPermission(install, "data:write");
  if (transactions.length === 0) {
    throw new Error("No transactions to post.");
  }

  const bearer = decryptSecret(install.api_key_encrypted);

  for (const transaction of transactions) {
    await blnkProxyPostJson(
      bearer,
      "/proxy/transactions",
      install.instance_id,
      normalizeTransactionItem(transaction)
    );
  }

  return { transactionCount: transactions.length };
}
