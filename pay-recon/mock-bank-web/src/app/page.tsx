import Link from "next/link";
import { bankApi, formatNGN, type BankAccount } from "@/lib/api";

export default async function HomePage() {
  let accounts: BankAccount[] = [];
  try {
    const res = await bankApi.get<{ items: BankAccount[] }>("/accounts");
    accounts = res.items ?? [];
  } catch {
    accounts = [];
  }

  const operating = accounts.find((a) => a.account_type === "operating");
  const beneficiaries = accounts.filter((a) => a.account_type !== "operating");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-bank">Welcome</p>
        <h1 className="mt-1 font-display text-3xl text-ink">Business banking</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Manage your company operating account: fund it, save beneficiaries, pay vendors, then
          download a statement for reconciliation in PayRecon.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface-elevated p-5 shadow-sm ring-1 ring-border">
          <p className="text-sm text-muted">Beneficiaries</p>
          <p className="mt-2 text-3xl font-semibold">{beneficiaries.length}</p>
        </div>
        <div className="rounded-2xl bg-surface-elevated p-5 shadow-sm ring-1 ring-border sm:col-span-2">
          <p className="text-sm text-muted">Operating balance</p>
          <p className="mt-2 text-3xl font-semibold">
            {operating ? formatNGN(operating.balance) : "—"}
          </p>
          {operating && (
            <p className="mt-1 text-xs text-muted">
              {operating.account_name} · {operating.account_number}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/fund"
          className="rounded-2xl bg-bank px-5 py-4 text-sm font-semibold text-white hover:bg-bank-dark"
        >
          Fund account →
        </Link>
        <Link
          href="/accounts"
          className="rounded-2xl bg-surface-elevated px-5 py-4 text-sm font-semibold text-ink ring-1 ring-border hover:bg-white"
        >
          Add beneficiary →
        </Link>
        <Link
          href="/transfers"
          className="rounded-2xl bg-surface-elevated px-5 py-4 text-sm font-semibold text-ink ring-1 ring-border hover:bg-white"
        >
          Make a transfer →
        </Link>
      </div>
    </div>
  );
}
