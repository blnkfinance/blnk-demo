import StatementExportForm from "@/components/StatementExportForm";
import { bankApi, formatNGN, type BankAccount } from "@/lib/api";
import { getAdminUrl } from "@/lib/urls";

export default async function StatementsPage() {
  let operating: BankAccount | null = null;
  try {
    operating = await bankApi.get<BankAccount>("/accounts/operating");
  } catch {
    operating = null;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Statements</h1>
        <p className="mt-1 text-sm text-muted">
          Download a CSV statement and upload it in PayRecon → Reconciliation. Choose a date
          range that covers the funding and payments you want to sync.
        </p>
      </div>

      <section className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
        {!operating ? (
          <p className="text-sm text-muted">Operating account is not available yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl px-4 py-3 ring-1 ring-border">
              <p className="font-medium">{operating.account_name}</p>
              <p className="text-xs text-muted">
                {operating.account_number} · {formatNGN(operating.balance)}
              </p>
            </div>
            <StatementExportForm accountID={operating.id} />
            <a
              href={`${getAdminUrl()}/reconciliation`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-bank hover:underline"
            >
              Upload in PayRecon reconciliation →
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
