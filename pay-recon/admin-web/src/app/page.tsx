import Link from "next/link";
import { api } from "@/lib/api";
import { getHorizonUrl } from "@/lib/urls";

async function getStats() {
  try {
    const [merchants, bills, runs, remittances] = await Promise.all([
      api.get<{ total: number }>("/merchants"),
      api.get<{ total: number }>("/bills"),
      api.get<{ total: number }>("/reconciliation/runs"),
      api.get<{ total?: number; items?: unknown[] }>("/tax-remittances"),
    ]);
    return {
      merchants: merchants.total,
      bills: bills.total,
      reconciliationRuns: runs.total,
      remittances: remittances.total ?? remittances.items?.length ?? 0,
      error: null as string | null,
    };
  } catch (err) {
    return {
      merchants: 0,
      bills: 0,
      reconciliationRuns: 0,
      remittances: 0,
      error: err instanceof Error ? err.message : "Failed to load dashboard stats",
    };
  }
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const stats = await getStats();
  const horizon = getHorizonUrl();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Bill payment, WHT, and bank reconciliation overview.
        </p>
      </div>

      {stats.error && (
        <p className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error ring-1 ring-error/20">
          Could not load stats: {stats.error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Merchants" value={stats.error ? "—" : stats.merchants} />
        <StatCard label="Bills" value={stats.error ? "—" : stats.bills} />
        <StatCard
          label="Reconciliation runs"
          value={stats.error ? "—" : stats.reconciliationRuns}
        />
        <StatCard label="Tax remittances" value={stats.error ? "—" : stats.remittances} />
      </div>

      <div className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
        <h2 className="font-semibold text-ink">Demo flow</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>
            <a
              href={`${horizon}/fund`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand hover:underline"
            >
              Fund
            </a>{" "}
            the company account in Horizon Bank.
          </li>
          <li>
            Add a{" "}
            <Link href="/merchants" className="font-medium text-brand hover:underline">
              merchant
            </Link>
            , then create a{" "}
            <Link href="/bills" className="font-medium text-brand hover:underline">
              bill
            </Link>
            .
          </li>
          <li>
            Pay in{" "}
            <a
              href={`${horizon}/transfers`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand hover:underline"
            >
              Horizon Bank
            </a>
            , confirm payment in PayRecon with the bank transaction ID.
          </li>
          <li>
            Upload the operating statement CSV in{" "}
            <Link href="/reconciliation" className="font-medium text-brand hover:underline">
              Reconciliation
            </Link>{" "}
            to sync bank cash and verify payments.
          </li>
          <li>
            Optionally create a{" "}
            <Link href="/remittances" className="font-medium text-brand hover:underline">
              tax remittance
            </Link>
            .
          </li>
        </ol>
      </div>
    </div>
  );
}
