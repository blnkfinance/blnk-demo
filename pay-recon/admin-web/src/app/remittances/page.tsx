import { CreateRemittanceForm, ConfirmRemittanceButton } from "@/components/RemittanceForms";
import { api } from "@/lib/api";
import { formatNGN } from "@/lib/money";
import type { Remittance } from "@/lib/types";

export default async function RemittancesPage() {
  let items: Remittance[] = [];
  try {
    const res = await api.get<{ items: Remittance[] }>("/tax-remittances");
    items = res.items ?? [];
  } catch {
    items = [];
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Tax remittances</h1>
        <p className="mt-1 text-sm text-muted">
          Remit accumulated WHT from tax payable toward FIRS via Blnk.
        </p>
      </div>

      <section className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
        <h2 className="font-semibold text-ink">Create remittance</h2>
        <div className="mt-4">
          <CreateRemittanceForm />
        </div>
      </section>

      <section className="rounded-2xl bg-surface-elevated shadow-sm ring-1 ring-border">
        {items.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted">No remittances yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Period</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {items.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-3 font-medium">{r.period}</td>
                  <td className="px-6 py-3">{formatNGN(r.total_amount)}</td>
                  <td className="px-6 py-3 capitalize">{r.status}</td>
                  <td className="px-6 py-3 text-muted">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <ConfirmRemittanceButton remittance={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
