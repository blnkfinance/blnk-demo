import { api } from "@/lib/api";
import InviteAdminForm from "./InviteAdminForm";

type Admin = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  created_at: string;
};

async function getAdmins() {
  try {
    return await api.get<{ data: Admin[]; total: number }>("/admins");
  } catch {
    return { data: [], total: 0 };
  }
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-success/10 text-success",
  inactive: "bg-border/30 text-muted",
};

export default async function AdminsPage() {
  const { data: rawAdmins } = await getAdmins();
  const admins = rawAdmins ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Admins</h1>
          <p className="mt-1 text-sm text-muted">
            Manage admin accounts that have access to this dashboard.
          </p>
        </div>
      </div>

      <InviteAdminForm />

      <div className="rounded-2xl bg-surface-elevated shadow-sm ring-1 ring-border">
        {admins.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted">No admins found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-3 font-medium text-ink">
                    {admin.first_name} {admin.last_name}
                  </td>
                  <td className="px-6 py-3 text-muted">{admin.email}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[admin.status] ?? "bg-border/30 text-muted"
                      }`}
                    >
                      {admin.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted">
                    {new Date(admin.created_at).toLocaleDateString()}
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
