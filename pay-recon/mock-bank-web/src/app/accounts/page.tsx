import AddBeneficiaryForm from "@/components/AddBeneficiaryForm";
import { bankApi, type BankAccount } from "@/lib/api";

export default async function AccountsPage() {
  let accounts: BankAccount[] = [];
  try {
    const res = await bankApi.get<{ items: BankAccount[] }>("/accounts");
    accounts = (res.items ?? []).filter((a) => a.account_type !== "operating");
  } catch {
    accounts = [];
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Beneficiaries</h1>
        <p className="mt-1 text-sm text-muted">
          Save vendor and one-off payee accounts. The company operating account is already set up.
        </p>
      </div>

      <section className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
        <h2 className="text-lg font-semibold">Add beneficiary</h2>
        <div className="mt-4">
          <AddBeneficiaryForm />
        </div>
      </section>

      <section className="rounded-2xl bg-surface-elevated shadow-sm ring-1 ring-border">
        {accounts.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted">No beneficiaries yet. Add one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Beneficiary</th>
                <th className="px-6 py-3">Account number</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td className="px-6 py-3 font-medium">{a.account_name}</td>
                  <td className="px-6 py-3 font-mono text-xs">{a.account_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
