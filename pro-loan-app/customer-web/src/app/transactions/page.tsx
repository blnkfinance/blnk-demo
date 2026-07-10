import Link from "next/link";
import { api } from "@/lib/api";
import {
  formatMoney,
  isCreditTx,
  txAmountColor,
  txLabel,
  type WalletTransaction,
} from "@/lib/transactions";

async function getTransactions(page: number) {
  try {
    return await api.get<{
      data: WalletTransaction[];
      total: number;
      page: number;
      page_size: number;
    }>(`/customers/me/transactions?page=${page}&page_size=20`);
  } catch {
    return { data: [], total: 0, page: 1, page_size: 20 };
  }
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const { data: transactions, total, page_size: pageSize } =
    await getTransactions(page);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-secondary hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">Transactions</h1>
        <p className="mt-1 text-sm text-muted">
          {total} transaction{total !== 1 ? "s" : ""}
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="card px-6 py-8 text-center">
          <p className="text-sm text-muted">No transactions yet.</p>
          <p className="mt-1 text-xs text-muted">
            Your activity will appear here once you send money or receive a loan.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-border/60">
            {transactions.map((tx) => {
              const credit = isCreditTx(tx.type);
              return (
                <li key={tx.id}>
                  <Link
                    href={`/transactions/${tx.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-card/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {txLabel(tx.type)}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(tx.created_at).toLocaleString()}
                        {tx.counterparty ? ` · ${tx.counterparty}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <p className={`text-sm font-bold ${txAmountColor(tx.type)}`}>
                        {credit ? "+" : "-"}
                        {formatMoney(tx.currency, tx.amount_cents)}
                      </p>
                      <span className="text-muted">›</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/transactions?page=${page - 1}`}
                className="rounded-lg px-3 py-1.5 ring-1 ring-border hover:bg-surface-elevated transition-colors"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/transactions?page=${page + 1}`}
                className="rounded-lg px-3 py-1.5 ring-1 ring-border hover:bg-surface-elevated transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
