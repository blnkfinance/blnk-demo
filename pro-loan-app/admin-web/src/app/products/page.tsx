import { api } from "@/lib/api";
import CreateProductForm from "./CreateProductForm";

type Product = {
  id: string;
  name: string;
  currency: string;
  principal_min_cents: number;
  principal_max_cents: number;
  annual_interest_bps: number;
  origination_fee_bps: number;
  term_months: number;
  archived: boolean;
  created_at: string;
};

async function getProducts() {
  try {
    return await api.get<{ data: Product[] }>("/products?include_archived=true");
  } catch {
    return { data: [] };
  }
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
}

export default async function ProductsPage() {
  let products: Product[] = [];
  try {
    const result = await getProducts();
    products = result.data ?? [];
  } catch {
    // fall through — products stays []
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Loan Products</h1>
        <p className="mt-1 text-sm text-muted">
          Manage the loan products available to customers.
        </p>
      </div>

      <CreateProductForm />

      <div className="rounded-2xl bg-surface-elevated shadow-sm ring-1 ring-border">
        {products.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted">
            No products yet. Create your first product above.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Currency</th>
                <th className="px-6 py-3">Min – Max</th>
                <th className="px-6 py-3">Rate (pa)</th>
                <th className="px-6 py-3">Fee</th>
                <th className="px-6 py-3">Term</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {products.map((p) => (
                <tr
                  key={p.id}
                  className={`transition-colors ${p.archived ? "opacity-50" : "hover:bg-surface"}`}
                >
                  <td className="px-6 py-3 font-medium text-ink">{p.name}</td>
                  <td className="px-6 py-3 text-muted">{p.currency}</td>
                  <td className="px-6 py-3 text-muted">
                    {p.currency} {fmt(p.principal_min_cents)} – {fmt(p.principal_max_cents)}
                  </td>
                  <td className="px-6 py-3 text-muted">
                    {(p.annual_interest_bps / 100).toFixed(2)}%
                  </td>
                  <td className="px-6 py-3 text-muted">
                    {(p.origination_fee_bps / 100).toFixed(2)}%
                  </td>
                  <td className="px-6 py-3 text-muted">{p.term_months} months</td>
                  <td className="px-6 py-3">
                    {p.archived ? (
                      <span className="rounded-full bg-border/30 px-2 py-0.5 text-xs text-muted">
                        Archived
                      </span>
                    ) : (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                        Active
                      </span>
                    )}
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
