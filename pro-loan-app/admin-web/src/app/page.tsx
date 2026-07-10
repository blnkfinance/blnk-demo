import { api } from "@/lib/api";

type LoanListResponse = {
  total: number;
  data: { status: string }[];
};

async function getStats() {
  try {
    const [allLoans, customers, products] = await Promise.all([
      api.get<LoanListResponse>("/loans?page=1&page_size=1"),
      api.get<{ total: number }>("/customers?page=1&page_size=1"),
      api.get<{ data: unknown[] }>("/products"),
    ]);

    const [active, pending] = await Promise.all([
      api.get<LoanListResponse>("/loans?status=active&page=1&page_size=1"),
      api.get<LoanListResponse>("/loans?status=submitted&page=1&page_size=1"),
    ]);

    return {
      totalLoans: allLoans.total,
      activeLoans: active.total,
      pendingLoans: pending.total,
      totalCustomers: customers.total,
      totalProducts: (products.data ?? []).length,
    };
  } catch {
    return null;
  }
}

async function getRecentLoans() {
  try {
    const res = await api.get<{
      data: {
        id: string;
        customer_id: string;
        status: string;
        principal_cents: number;
        currency: string;
        created_at: string;
      }[];
    }>("/loans?page=1&page_size=8");
    return res.data ?? [];
  } catch {
    return [];
  }
}

function StatCard({
  label,
  value,
  color = "text-ink",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-border/30 text-muted",
  submitted: "bg-warning/10 text-warning",
  approved: "bg-info/10 text-info",
  active: "bg-success/10 text-success",
  rejected: "bg-error/10 text-error",
  closed: "bg-border/30 text-muted",
};

export default async function DashboardPage() {
  const [stats, recent] = await Promise.all([getStats(), getRecentLoans()]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Operational overview of the Pro Loan platform.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total loans" value={stats?.totalLoans ?? "—"} />
        <StatCard
          label="Active loans"
          value={stats?.activeLoans ?? "—"}
          color="text-success"
        />
        <StatCard
          label="Pending review"
          value={stats?.pendingLoans ?? "—"}
          color="text-warning"
        />
        <StatCard label="Customers" value={stats?.totalCustomers ?? "—"} />
      </div>

      <div className="rounded-2xl bg-surface-elevated shadow-sm ring-1 ring-border">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <h2 className="font-semibold text-ink">Recent loan applications</h2>
          <a href="/loans" className="text-sm text-brand hover:underline">
            View all →
          </a>
        </div>
        {recent.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted">No loan applications yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {recent.map((loan) => (
                <tr
                  key={loan.id}
                  className="hover:bg-surface transition-colors"
                >
                  <td className="px-6 py-3">
                    <a
                      href={`/loans/${loan.id}`}
                      className="font-mono text-brand hover:underline"
                    >
                      {loan.id.slice(0, 8)}…
                    </a>
                  </td>
                  <td className="px-6 py-3 font-mono text-xs">
                    {loan.customer_id.slice(0, 8)}…
                  </td>
                  <td className="px-6 py-3 font-medium">
                    {loan.currency}{" "}
                    {(loan.principal_cents / 100).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
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
    </div>
  );
}
