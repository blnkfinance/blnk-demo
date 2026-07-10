import { getTreasuryStatus } from "@/lib/treasury-actions";
import PrefundForm from "./PrefundForm";

function formatMoney(currency: string, cents: number) {
  return `${currency} ${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function TreasuryPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string }>;
}) {
  const params = await searchParams;
  const currency = params.currency?.toUpperCase() || "NGN";

  let treasury;
  try {
    treasury = await getTreasuryStatus(currency);
  } catch {
    treasury = null;
  }

  const status = treasury?.status;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Treasury</h1>
        <p className="mt-1 text-sm text-muted">
          Manage platform funding pool capital for loan disbursements.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
          <p className="text-sm text-muted">Funding pool</p>
          <p className="mt-2 font-mono text-xs text-muted">
            {status?.funding_pool_indicator ?? `@FundingPool${currency}`}
          </p>
          <p className="mt-2 text-3xl font-bold text-brand">
            {status
              ? formatMoney(status.currency, status.funding_pool_balance_cents)
              : "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
          <p className="text-sm text-muted">External boundary (@World)</p>
          <p className="mt-2 font-mono text-xs text-muted">
            {status?.world_indicator ?? `@World${currency}`}
          </p>
          <p className="mt-2 text-3xl font-bold text-ink">
            {status
              ? formatMoney(status.currency, status.world_balance_cents)
              : "—"}
          </p>
        </div>
      </div>

      <PrefundForm
        initialCurrency={currency}
        fundingPoolBalanceCents={status?.funding_pool_balance_cents ?? 0}
      />

      <div className="rounded-2xl bg-surface-elevated shadow-sm ring-1 ring-border">
        <div className="border-b border-border/60 px-6 py-4">
          <h2 className="font-semibold text-ink">Recent prefunds</h2>
        </div>
        {!treasury?.recent_prefunds?.length ? (
          <p className="px-6 py-8 text-sm text-muted">No prefund operations yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Reference</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Blnk tx</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {treasury.recent_prefunds.map((op) => (
                <tr key={op.id}>
                  <td className="px-6 py-3 font-mono text-xs">{op.reference}</td>
                  <td className="px-6 py-3 font-medium">
                    {formatMoney(op.currency, op.amount_cents)}
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-muted">
                    {op.blnk_transaction_id
                      ? `${op.blnk_transaction_id.slice(0, 12)}…`
                      : "—"}
                  </td>
                  <td className="px-6 py-3 text-muted">
                    {new Date(op.created_at).toLocaleString()}
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
