import Link from "next/link";
import { api } from "@/lib/api";
import {
  formatMoney,
  isCreditTx,
  txAmountColor,
  txLabel,
  type WalletTransaction,
} from "@/lib/transactions";

type WalletBalanceEntry = {
  currency: string;
  balance_cents: number;
};

type CustomerWithBalance = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  wallet_balances?: WalletBalanceEntry[];
  wallet_balance: number | null;
};

type LoanScheduleLine = {
  id: string;
  principal_cents: number;
  interest_cents: number;
  fee_cents: number;
  status: string;
  due_date: string;
  paid_at?: string;
};

type Loan = {
  id: string;
  status: string;
  principal_cents: number;
  currency: string;
  term_months: number;
  annual_interest_bps: number;
  schedule: LoanScheduleLine[] | null;
  created_at: string;
  disbursed_at?: string;
};

async function getCustomer(): Promise<CustomerWithBalance | null> {
  try {
    return await api.get<CustomerWithBalance>("/customers/me");
  } catch {
    return null;
  }
}

async function getTransactions() {
  try {
    return await api.get<{ data: WalletTransaction[]; total: number }>(
      "/customers/me/transactions?page=1&page_size=10"
    );
  } catch {
    return { data: [], total: 0 };
  }
}

async function getLoans() {
  try {
    const jar = await import("next/headers").then((m) => m.cookies());
    const customerID = jar.get("customer_id")?.value ?? "";
    if (!customerID) return { data: [], total: 0 };
    return await api.get<{ data: Loan[]; total: number }>(
      `/loans?customer_id=${customerID}&page=1&page_size=50`
    );
  } catch {
    return { data: [], total: 0 };
  }
}

export default async function DashboardPage() {
  const customer = await getCustomer();
  const { data: transactions } = await getTransactions();
  const { data: loans } = await getLoans();

  const activeLoans = loans.filter((l) => l.status === "active");
  const ngnWallet = customer?.wallet_balances?.find((w) => w.currency === "NGN");
  const primaryBalance =
    ngnWallet?.balance_cents ?? customer?.wallet_balance ?? null;
  const primaryCurrency = ngnWallet?.currency ?? "NGN";

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="flex flex-col gap-8">
      {customer && (
        <p className="text-sm text-muted">
          {greeting},{" "}
          <span className="font-medium text-ink">
            {customer.first_name} {customer.last_name}
          </span>
        </p>
      )}

      {/* Balance Card */}
      <section>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary via-emerald-500 to-teal-600 p-6 text-white shadow-2xl shadow-secondary/25">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-8 h-48 w-48 rounded-full bg-white/5" />
          <div className="relative">
            <p className="text-xs uppercase tracking-wider text-white/80">
              Total Balance
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              {primaryBalance != null
                ? formatMoney(primaryCurrency, primaryBalance)
                : `${primaryCurrency} 0.00`}
            </p>
            {customer?.wallet_balances && customer.wallet_balances.length > 1 && (
              <div className="mt-3 space-y-1 text-sm text-white/75">
                {customer.wallet_balances
                  .filter((w) => w.currency !== primaryCurrency)
                  .map((w) => (
                    <p key={w.currency}>
                      {formatMoney(w.currency, w.balance_cents)}
                    </p>
                  ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/send"
            className="card-hover flex flex-col items-center gap-2 p-5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/15 text-secondary ring-1 ring-secondary/30">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <span className="text-sm font-medium text-ink">Send</span>
          </Link>

          <div className="card flex flex-col items-center gap-2 p-5 opacity-50 cursor-not-allowed">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-card text-muted ring-1 ring-border">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-muted">Pay Bills</span>
          </div>

          <Link
            href="/loans"
            className="card-hover flex flex-col items-center gap-2 p-5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/15 text-secondary ring-1 ring-secondary/30">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-ink">Loans</span>
          </Link>
        </div>
      </section>

      {/* Recent Transactions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <Link href="/transactions" className="section-label hover:text-secondary transition-colors">
            Recent Transactions
          </Link>
          {transactions.length > 0 && (
            <Link
              href="/transactions"
              className="text-xs text-secondary hover:underline"
            >
              View all →
            </Link>
          )}
        </div>
        {transactions.length === 0 ? (
          <div className="card px-6 py-8 text-center">
            <p className="text-sm text-muted">No transactions yet.</p>
            <p className="mt-1 text-xs text-muted">
              Your activity will appear here once you take action.
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
      </section>

      {/* Active Loans */}
      {activeLoans.length > 0 && (
        <section>
          <h2 className="section-label mb-3">Active Loans</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeLoans.map((loan) => (
              <ActiveLoanCard key={loan.id} loan={loan} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ActiveLoanCard({ loan }: { loan: Loan }) {
  const schedule = loan.schedule ?? [];
  const paid = schedule.filter((l) => l.status === "paid").length;
  const total = schedule.length;
  const nextDue = schedule.find(
    (l) => l.status === "due" || l.status === "overdue" || l.status === "scheduled"
  );

  return (
    <Link href={`/loans/${loan.id}`} className="card-hover flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-bold text-ink">
            {formatMoney(loan.currency, loan.principal_cents)}
          </p>
          <p className="text-xs text-muted">
            {loan.term_months} months · {(loan.annual_interest_bps / 100).toFixed(1)}% pa
          </p>
        </div>
        <span className="inline-flex rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success ring-1 ring-success/30">
          active
        </span>
      </div>

      {total > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span>Repayments</span>
            <span>
              {paid}/{total}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-card">
            <div
              className="h-full rounded-full bg-gradient-to-r from-secondary to-emerald-400 transition-all"
              style={{ width: `${total > 0 ? (paid / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {nextDue && (
        <p className="text-xs text-muted">
          Next due: {new Date(nextDue.due_date).toLocaleDateString()}
        </p>
      )}
    </Link>
  );
}
