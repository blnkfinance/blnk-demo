import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import {
  formatBalance,
  formatMoney,
  isCreditTx,
  txAmountColor,
  txLabel,
  type WalletTransaction,
} from "@/lib/transactions";

import type { ReactNode } from "react";

async function getTransaction(id: string): Promise<WalletTransaction | null> {
  try {
    return await api.get<WalletTransaction>(`/customers/me/transactions/${id}`);
  } catch {
    return null;
  }
}

function DetailRow({
  label,
  value,
  valueClassName = "text-ink",
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/60 last:border-0">
      <span className="text-sm text-muted shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${valueClassName}`}>
        {value}
      </span>
    </div>
  );
}

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tx = await getTransaction(id);

  if (!tx) {
    notFound();
  }

  const credit = isCreditTx(tx.type);
  const amountColor = txAmountColor(tx.type);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/transactions" className="text-sm text-secondary hover:underline">
          ← Back to transactions
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">{txLabel(tx.type)}</h1>
        <p className="mt-1 text-xs text-muted font-mono">{tx.id}</p>
      </div>

      <div className="card p-6">
        <p className="text-xs uppercase tracking-wider text-muted">Amount</p>
        <p className={`mt-1 text-3xl font-bold ${amountColor}`}>
          {credit ? "+" : "-"}
          {formatMoney(tx.currency, tx.amount_cents)}
        </p>
        <p className="mt-2 text-sm text-muted">
          {credit ? "Credit" : "Debit"} · {tx.currency}
        </p>
      </div>

      <div className="card p-6">
        <h2 className="mb-2 font-semibold text-ink">Details</h2>
        <DetailRow label="Type" value={txLabel(tx.type)} />
        <DetailRow
          label="Date"
          value={new Date(tx.created_at).toLocaleString()}
        />
        {tx.counterparty && (
          <DetailRow label="Counterparty" value={tx.counterparty} />
        )}
        {tx.description && (
          <DetailRow label="Description" value={tx.description} />
        )}
        {tx.reference && (
          <DetailRow
            label="Reference"
            value={<span className="font-mono text-xs">{tx.reference}</span>}
          />
        )}
        {tx.balance_after != null && tx.balance_after > 0 && (
          <DetailRow
            label="Balance after"
            value={formatBalance(tx.currency, tx.balance_after)}
            valueClassName="text-secondary"
          />
        )}
        {tx.blnk_tx_id && (
          <DetailRow
            label="Ledger ref"
            value={
              <span className="font-mono text-xs break-all">{tx.blnk_tx_id}</span>
            }
          />
        )}
      </div>
    </div>
  );
}
