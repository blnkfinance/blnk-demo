import { api } from "@/lib/api";
import SyncIdentityButton from "./SyncIdentityButton";

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  blnk_identity_id?: string;
  created_at: string;
};

async function getCustomers(page: number) {
  try {
    return await api.get<{ data: Customer[]; total: number }>(
      `/customers?page=${page}&page_size=20`
    );
  } catch {
    return { data: [], total: 0 };
  }
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const { data: rawCustomers, total } = await getCustomers(page);
  const customers = rawCustomers ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Customers</h1>
          <p className="mt-1 text-sm text-muted">
            {total} registered customer{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-surface-elevated shadow-sm ring-1 ring-border">
        {customers.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted">No customers found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Blnk Identity</th>
                <th className="px-6 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {customers.map((c) => (
                <tr key={c.id} className="relative hover:bg-surface transition-colors cursor-pointer">
                  <td className="px-6 py-3 font-medium text-ink">
                    <a
                      href={`/customers/${c.id}`}
                      className="absolute inset-0"
                      aria-label={`View customer ${c.id}`}
                    />
                    {c.first_name} {c.last_name}
                    <p className="font-mono text-xs text-muted">{c.id.slice(0, 12)}…</p>
                  </td>
                  <td className="px-6 py-3 text-muted">{c.email}</td>
                  <td className="px-6 py-3 text-muted">{c.phone || "—"}</td>
                  <td className="px-6 py-3 relative">
                    {c.blnk_identity_id ? (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success relative z-10">
                        {c.blnk_identity_id.slice(0, 12)}…
                      </span>
                    ) : (
                      <span className="relative z-10">
                        <SyncIdentityButton customerId={c.id} />
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-muted">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 20 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`/customers?page=${page - 1}`}
                className="rounded-lg px-3 py-1.5 ring-1 ring-border hover:bg-border/30"
              >
                ← Prev
              </a>
            )}
            {page * 20 < total && (
              <a
                href={`/customers?page=${page + 1}`}
                className="rounded-lg px-3 py-1.5 ring-1 ring-border hover:bg-border/30"
              >
                Next →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
