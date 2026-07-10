import { api } from "@/lib/api";
import Link from "next/link";
import { notFound } from "next/navigation";

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  blnk_identity_id?: string;
  wallet_balance_id?: string;
  created_at: string;
  updated_at: string;
};

type WalletTransaction = {
  id: string;
  type: string;
  amount_cents: number;
  currency: string;
  description: string;
  created_at: string;
};

type Loan = {
  id: string;
  status: string;
  principal_cents: number;
  currency: string;
  term_months: number;
  annual_interest_bps: number;
  created_at: string;
};

type ScheduleLine = {
  id: string;
  status: string;
};

async function getCustomer(id: string) {
  try {
    return await api.get<Customer>(`/customers/${id}`);
  } catch {
    return null;
  }
}

async function getLoans(customerID: string) {
  try {
    return await api.get<{ data: Loan[]; total: number }>(
      `/loans?customer_id=${customerID}&page=1&page_size=20`
    );
  } catch {
    return { data: [], total: 0 };
  }
}

async function getTransactions(customerID: string) {
  try {
    return await api.get<{ data: WalletTransaction[]; total: number }>(
      `/customers/${customerID}/transactions?page=1&page_size=10`
    );
  } catch {
    return { data: [], total: 0 };
  }
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-border/30 text-muted",
  submitted: "bg-warning/10 text-warning",
  approved: "bg-info/10 text-info",
  active: "bg-success/10 text-success",
  rejected: "bg-error/10 text-error",
  closed: "bg-border/30 text-muted",
};

const TX_LABELS: Record<string, string> = {
  loan_disbursement: "Loan Disbursement",
  loan_repayment: "Loan Repayment",
  transfer_sent: "Transfer Sent",
  transfer_received: "Transfer Received",
  fee: "Transfer Fee",
};

function formatMoney(currency: string, cents: number) {
  return `${currency} ${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customer = await getCustomer(id);
  if (!customer) notFound();

  const [{ data: loans }, { data: transactions }] = await Promise.all([
    getLoans(id),
    getTransactions(id),
  ]);

  const activeLoans = loans.filter((l) => l.status === "active");

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <a href="/customers" className="text-sm text-brand hover:underline">
        ← Back to customers
      </a>

      {/* Profile card */}
      <div className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">
              {customer.first_name} {customer.last_name}
            </h1>
            <p className="mt-1 text-sm text-muted">{customer.email}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Phone</p>
            <p className="mt-0.5 text-sm font-medium text-ink">
              {customer.phone || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Joined</p>
            <p className="mt-0.5 text-sm font-medium text-ink">
              {new Date(customer.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted">Customer ID</p>
            <p className="mt-0.5 text-sm font-mono text-ink">{customer.id}</p>
          </div>
        </div>
      </div>

      {/* Blnk info card */}
      <div className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
        <h2 className="mb-4 font-semibold text-ink">Blnk References</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-surface p-3">
            <p className="text-xs text-muted">Identity ID</p>
            <p className="mt-0.5 text-sm font-mono text-ink">
              {customer.blnk_identity_id || (
                <span className="text-muted">Not synced</span>
              )}
            </p>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <p className="text-xs text-muted">Wallet Balance ID</p>
            <p className="mt-0.5 text-sm font-mono text-ink">
              {customer.wallet_balance_id || (
                <span className="text-muted">Not created</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Active loans */}
      {activeLoans.length > 0 && (
        <div className="rounded-2xl bg-surface-elevated shadow-sm ring-1 ring-border">
          <div className="border-b border-border/60 px-6 py-4">
            <h2 className="font-semibold text-ink">Active Loans</h2>
            <p className="text-xs text-muted mt-1">
              {activeLoans.length} active loan{activeLoans.length > 1 ? "s" : ""}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Loan ID</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Term</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {activeLoans.map((loan) => (
                <tr
                  key={loan.id}
                  className="hover:bg-surface transition-colors"
                >
                  <td className="px-6 py-3">
                    <Link
                      href={`/loans/${loan.id}`}
                      className="font-mono text-sm text-brand hover:underline"
                    >
                      {loan.id.slice(0, 12)}…
                    </Link>
                  </td>
                  <td className="px-6 py-3 font-medium text-ink">
                    {formatMoney(loan.currency, loan.principal_cents)}
                  </td>
                  <td className="px-6 py-3 text-muted">
                    {loan.term_months}mo
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[loan.status] ?? "bg-border/30"
                      }`}
                    >
                      {loan.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted">
                    {new Date(loan.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* All loans */}
      <div className="rounded-2xl bg-surface-elevated shadow-sm ring-1 ring-border">
        <div className="border-b border-border/60 px-6 py-4">
          <h2 className="font-semibold text-ink">
            All Loans ({loans.length})
          </h2>
        </div>
        {loans.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted">
            This customer has no loan applications.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Loan ID</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Term</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loans.map((loan) => (
                <tr
                  key={loan.id}
                  className="hover:bg-surface transition-colors"
                >
                  <td className="px-6 py-3">
                    <Link
                      href={`/loans/${loan.id}`}
                      className="font-mono text-sm text-brand hover:underline"
                    >
                      {loan.id.slice(0, 12)}…
                    </Link>
                  </td>
                  <td className="px-6 py-3 font-medium text-ink">
                    {formatMoney(loan.currency, loan.principal_cents)}
                  </td>
                  <td className="px-6 py-3 text-muted">
                    {loan.term_months}mo
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[loan.status] ?? "bg-border/30"
                      }`}
                    >
                      {loan.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted">
                    {new Date(loan.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Wallet transactions */}
      <div className="rounded-2xl bg-surface-elevated shadow-sm ring-1 ring-border">
        <div className="border-b border-border/60 px-6 py-4">
          <h2 className="font-semibold text-ink">
            Recent Wallet Transactions ({transactions.length})
          </h2>
        </div>
        {transactions.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted">
            No wallet transactions yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {transactions.map((tx) => {
                const isCredit =
                  tx.type === "loan_disbursement" ||
                  tx.type === "transfer_received";
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-surface transition-colors"
                  >
                    <td className="px-6 py-3 text-muted">
                      {TX_LABELS[tx.type] ?? tx.type}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={
                          isCredit ? "text-success" : "text-error"
                        }
                      >
                        {isCredit ? "+" : "-"}
                        {formatMoney(tx.currency, tx.amount_cents)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted">{tx.description}</td>
                    <td className="px-6 py-3 text-muted">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
