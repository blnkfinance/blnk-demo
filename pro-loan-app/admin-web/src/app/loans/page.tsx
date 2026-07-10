import { api } from "@/lib/api";

type Loan = {
  id: string;
  customer_id: string;
  product_id: string;
  status: string;
  principal_cents: number;
  currency: string;
  term_months: number;
  annual_interest_bps: number;
  created_at: string;
  approved_at?: string;
  disbursed_at?: string;
};

const STATUSES = ["", "draft", "submitted", "approved", "active", "rejected", "closed"];

async function getLoans(status: string, page: number) {
  const qs = new URLSearchParams({ page: String(page), page_size: "20" });
  if (status) qs.set("status", status);
  try {
    return await api.get<{ data: Loan[]; total: number }>(`/loans?${qs}`);
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
  defaulted: "bg-warning/10 text-warning",
};

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const { data: rawLoans, total } = await getLoans(status, page);
  const loans = rawLoans ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Loan Applications</h1>
        <p className="mt-1 text-sm text-muted">
          {total} loan{total !== 1 ? "s" : ""}{status ? ` with status "${status}"` : ""}
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <a
            key={s || "all"}
            href={s ? `/loans?status=${s}` : "/loans"}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              status === s
                ? "bg-brand text-white"
                : "bg-surface-elevated text-muted ring-1 ring-border hover:bg-border/30"
            }`}
          >
            {s || "All"}
          </a>
        ))}
      </div>

      <div className="rounded-2xl bg-surface-elevated shadow-sm ring-1 ring-border">
        {loans.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted">No loans found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Loan ID</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Term</th>
                <th className="px-6 py-3">Rate</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loans.map((loan) => (
                <tr key={loan.id} className="relative hover:bg-surface transition-colors cursor-pointer">
                  <td className="px-6 py-3">
                    <a
                      href={`/loans/${loan.id}`}
                      className="absolute inset-0"
                      aria-label={`View loan ${loan.id}`}
                    />
                    <span className="font-mono text-brand">{loan.id.slice(0, 10)}…</span>
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-muted">
                    {loan.customer_id.slice(0, 10)}…
                  </td>
                  <td className="px-6 py-3 font-medium">
                    {loan.currency}{" "}
                    {(loan.principal_cents / 100).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-6 py-3 text-muted">{loan.term_months}mo</td>
                  <td className="px-6 py-3 text-muted">
                    {(loan.annual_interest_bps / 100).toFixed(2)}%
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`relative inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[loan.status] ?? "bg-border/30 text-muted"
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

      {total > 20 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Page {page} of {Math.ceil(total / 20)}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <a href={`/loans?status=${status}&page=${page - 1}`} className="rounded-lg px-3 py-1.5 ring-1 ring-border hover:bg-border/30">
                ← Prev
              </a>
            )}
            {page * 20 < total && (
              <a href={`/loans?status=${status}&page=${page + 1}`} className="rounded-lg px-3 py-1.5 ring-1 ring-border hover:bg-border/30">
                Next →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
