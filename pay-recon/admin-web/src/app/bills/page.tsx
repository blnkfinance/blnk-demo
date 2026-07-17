import CreateBillForm from "@/components/CreateBillForm";
import ConfirmPaymentForm from "@/components/ConfirmPaymentForm";
import { api } from "@/lib/api";
import { formatNGN } from "@/lib/money";
import type { Bill, Merchant, WHTCategory } from "@/lib/types";

type SearchParams = {
  confirmBill?: string;
  bankTxn?: string;
};

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const integratedDemo = Boolean(params.confirmBill && params.bankTxn);

  let bills: Bill[] = [];
  let merchants: Merchant[] = [];
  let categories: WHTCategory[] = [];

  try {
    const [billsRes, merchantsRes, catsRes] = await Promise.all([
      api.get<{ items: Bill[] }>("/bills"),
      api.get<{ items: Merchant[] }>("/merchants"),
      api.get<{ items: WHTCategory[] }>("/wht-categories"),
    ]);
    bills = billsRes.items ?? [];
    merchants = merchantsRes.items ?? [];
    categories = catsRes.items ?? [];
  } catch {
    // keep empty
  }

  const merchantName = (id: string) => merchants.find((m) => m.id === id)?.name ?? id.slice(0, 8);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Bills</h1>
        <p className="mt-1 text-sm text-muted">
          Create vendor bills. After paying via the bank, confirm with the bank transaction ID.
        </p>
      </div>

      {integratedDemo && (
        <div className="rounded-xl bg-info/10 px-4 py-3 text-sm text-info ring-1 ring-info/20">
          Simulated bank integration: bank transaction ID pre-filled for bill{" "}
          <span className="font-mono">{params.confirmBill?.slice(0, 8)}…</span>. Review and
          confirm below.
        </div>
      )}

      <section className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
        <h2 className="font-semibold text-ink">Create bill</h2>
        {merchants.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Add a merchant first (with TIN and bank account). Then add that account as a
            beneficiary in Horizon before paying.
          </p>
        ) : (
          <div className="mt-4">
            <CreateBillForm merchants={merchants} categories={categories} />
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-surface-elevated shadow-sm ring-1 ring-border">
        {bills.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted">No bills yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Payment ref</th>
                <th className="px-6 py-3">Vendor invoice</th>
                <th className="px-6 py-3">Merchant</th>
                <th className="px-6 py-3">Gross</th>
                <th className="px-6 py-3">WHT</th>
                <th className="px-6 py-3">Net</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Payment confirmation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {bills.map((b) => (
                <tr key={b.id}>
                  <td className="px-6 py-3 font-mono text-xs">{b.bill_reference}</td>
                  <td className="px-6 py-3 text-muted">{b.vendor_invoice_ref ?? "—"}</td>
                  <td className="px-6 py-3">{merchantName(b.merchant_id)}</td>
                  <td className="px-6 py-3">{formatNGN(b.gross_amount)}</td>
                  <td className="px-6 py-3">{formatNGN(b.wht_amount)}</td>
                  <td className="px-6 py-3">{formatNGN(b.net_amount)}</td>
                  <td className="px-6 py-3">
                    <StatusPill status={b.status} />
                  </td>
                  <td className="px-6 py-3">
                    <ConfirmPaymentForm
                      bill={b}
                      prefilledBankTxn={
                        params.confirmBill === b.id ? params.bankTxn : undefined
                      }
                      integratedDemo={integratedDemo && params.confirmBill === b.id}
                    />
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

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "paid_reconciled" || status === "paid"
      ? "bg-success/10 text-success"
      : status === "paid_unreconciled"
        ? "bg-info/10 text-info"
        : status === "awaiting_payment"
          ? "bg-warning/10 text-warning"
          : "bg-surface text-muted";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${tone}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
