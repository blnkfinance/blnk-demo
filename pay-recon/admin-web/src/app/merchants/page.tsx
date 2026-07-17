import CreateMerchantForm from "@/components/CreateMerchantForm";
import { api } from "@/lib/api";
import type { Merchant } from "@/lib/types";

export default async function MerchantsPage() {
  let items: Merchant[] = [];
  let loadError: string | null = null;
  try {
    const res = await api.get<{ items: Merchant[] }>("/merchants");
    items = res.items ?? [];
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load merchants";
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Merchants</h1>
        <p className="mt-1 text-sm text-muted">
          Vendors and payees. Each merchant gets a Blnk identity and balance. Add the same bank
          account as a beneficiary in Horizon (separately) before paying.
        </p>
      </div>

      {loadError && (
        <p className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error ring-1 ring-error/20">
          {loadError}
        </p>
      )}

      <section className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
        <h2 className="font-semibold text-ink">Add merchant</h2>
        <p className="mt-1 text-sm text-muted">TIN is required before you can create bills.</p>
        <div className="mt-4">
          <CreateMerchantForm />
        </div>
      </section>

      <section className="rounded-2xl bg-surface-elevated shadow-sm ring-1 ring-border">
        {items.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted">
            {loadError ? "Merchants unavailable." : "No merchants yet. Add one above."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">TIN</th>
                <th className="px-6 py-3">Bank</th>
                <th className="px-6 py-3">Account</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {items.map((m) => (
                <tr key={m.id}>
                  <td className="px-6 py-3 font-medium">{m.name}</td>
                  <td className="px-6 py-3">{m.tin ?? "—"}</td>
                  <td className="px-6 py-3">{m.bank_name}</td>
                  <td className="px-6 py-3 font-mono text-xs">{m.bank_account_number}</td>
                  <td className="px-6 py-3 capitalize">{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
