export type WalletTransaction = {
  id: string;
  type: string;
  amount_cents: number;
  currency: string;
  description: string;
  reference: string;
  counterparty: string;
  balance_after?: number;
  blnk_tx_id?: string;
  created_at: string;
};

export const TX_LABELS: Record<string, string> = {
  loan_disbursement: "Loan Disbursement",
  loan_repayment: "Loan Repayment",
  transfer_sent: "Transfer Sent",
  transfer_received: "Transfer Received",
  fee: "Fee",
};

export const TX_COLORS: Record<string, string> = {
  loan_disbursement: "text-success",
  loan_repayment: "text-error",
  transfer_sent: "text-error",
  transfer_received: "text-success",
  fee: "text-warning",
};

export function isCreditTx(type: string) {
  return type === "loan_disbursement" || type === "transfer_received";
}

export function formatMoney(currency: string, cents: number) {
  return `${currency} ${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatBalance(currency: string, balance: number) {
  return `${currency} ${balance.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function txLabel(type: string) {
  return TX_LABELS[type] ?? type.replace(/_/g, " ");
}

export function txAmountColor(type: string) {
  return TX_COLORS[type] ?? "text-ink";
}
