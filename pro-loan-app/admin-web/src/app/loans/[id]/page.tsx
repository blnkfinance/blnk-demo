import { api } from "@/lib/api";
import LoanActions from "./LoanActions";

type ScheduleLine = {
  id: string;
  due_date: string;
  principal_cents: number;
  interest_cents: number;
  fee_cents: number;
  status: string;
  paid_at?: string;
};

type Loan = {
  id: string;
  customer_id: string;
  product_id: string;
  status: string;
  principal_cents: number;
  currency: string;
  term_months: number;
  annual_interest_bps: number;
  origination_fee_bps: number;
  schedule: ScheduleLine[] | null;
  blnk_mappings?: {
    identity_id?: string;
    loan_balance_id?: string;
    disbursement_transaction_id?: string;
  } | null;
  created_at: string;
  approved_at?: string;
  disbursed_at?: string;
  committed_at?: string;
  rejected_at?: string;
  rejection_note?: string;
};

async function getLoan(id: string) {
  return api.get<Loan>(`/loans/${id}`);
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-border/30 text-muted",
  submitted: "bg-warning/10 text-warning ring-1 ring-yellow-200",
  approved: "bg-info/10 text-info ring-1 ring-info/30",
  active: "bg-success/10 text-success ring-1 ring-success/30",
  rejected: "bg-error/10 text-error ring-1 ring-error/30",
  closed: "bg-border/30 text-muted",
};

const SCHEDULE_COLORS: Record<string, string> = {
  scheduled: "bg-border/30 text-muted",
  due: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
  overdue: "bg-error/10 text-error",
  void: "bg-border/30 text-muted",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loan = await getLoan(id);

  const schedule = loan.schedule ?? [];
  const blnkMappings = loan.blnk_mappings ?? {};
  const totalInterest = schedule.reduce((s, l) => s + l.interest_cents, 0);
  const totalFees = schedule.reduce((s, l) => s + l.fee_cents, 0);
  const paidLines = schedule.filter((l) => l.status === "paid").length;

  function fmt(cents: number) {
    return `${loan.currency} ${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <a href="/loans" className="text-sm text-brand hover:underline">
            ← Back to loans
          </a>
          <h1 className="mt-2 text-2xl font-bold text-ink">Loan detail</h1>
          <p className="mt-1 font-mono text-sm text-muted">{loan.id}</p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
            STATUS_COLORS[loan.status] ?? "bg-border/30 text-muted"
          }`}
        >
          {loan.status}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
          <h2 className="mb-3 font-semibold text-ink">Loan details</h2>
          <InfoRow label="Principal" value={fmt(loan.principal_cents)} />
          <InfoRow label="Term" value={`${loan.term_months} months`} />
          <InfoRow label="Annual rate" value={`${(loan.annual_interest_bps / 100).toFixed(2)}%`} />
          <InfoRow label="Origination fee" value={`${(loan.origination_fee_bps / 100).toFixed(2)}%`} />
          <InfoRow label="Total interest" value={fmt(totalInterest)} />
          <InfoRow label="Total fees" value={fmt(totalFees)} />
          <InfoRow
            label="Applied"
            value={new Date(loan.created_at).toLocaleDateString()}
          />
          {loan.approved_at && (
            <InfoRow
              label="Approved"
              value={new Date(loan.approved_at).toLocaleDateString()}
            />
          )}
          {loan.disbursed_at && (
            <InfoRow
              label="Disbursed"
              value={new Date(loan.disbursed_at).toLocaleDateString()}
            />
          )}
          {loan.committed_at && (
            <InfoRow
              label="Disbursement committed"
              value={new Date(loan.committed_at).toLocaleDateString()}
            />
          )}
          {loan.rejection_note && (
            <InfoRow label="Rejection note" value={loan.rejection_note} />
          )}
        </div>

        <div className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
          <h2 className="mb-3 font-semibold text-ink">Blnk mappings</h2>
          <InfoRow
            label="Identity"
            value={blnkMappings.identity_id ? (
              <span className="font-mono text-xs">{blnkMappings.identity_id}</span>
            ) : "—"}
          />
          <InfoRow
            label="Balance"
            value={blnkMappings.loan_balance_id ? (
              <span className="font-mono text-xs">{blnkMappings.loan_balance_id}</span>
            ) : "—"}
          />
          <InfoRow
            label="Disbursement TX"
            value={blnkMappings.disbursement_transaction_id ? (
              <span className="font-mono text-xs">
                {blnkMappings.disbursement_transaction_id.slice(0, 16)}…
              </span>
            ) : "—"}
          />
          <h2 className="mt-4 mb-3 font-semibold text-ink">Customer</h2>
          <InfoRow
            label="Customer ID"
            value={<span className="font-mono text-xs">{loan.customer_id}</span>}
          />
          {schedule.length > 0 && (
            <>
              <h2 className="mt-4 mb-3 font-semibold text-ink">Schedule progress</h2>
              <InfoRow
                label="Paid instalments"
                value={`${paidLines} / ${schedule.length}`}
              />
            </>
          )}
        </div>
      </div>

      <LoanActions
        loanId={loan.id}
        status={loan.status}
        currency={loan.currency}
        committedAt={loan.committed_at}
        schedule={schedule}
      />

      {schedule.length > 0 && (
        <div className="rounded-2xl bg-surface-elevated shadow-sm ring-1 ring-border">
          <div className="border-b border-border/60 px-6 py-4">
            <h2 className="font-semibold text-ink">Repayment schedule</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Due</th>
                <th className="px-6 py-3">Principal</th>
                <th className="px-6 py-3">Interest</th>
                <th className="px-6 py-3">Fee</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {schedule.map((line, i) => (
                <tr key={line.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-3 text-muted">{i + 1}</td>
                  <td className="px-6 py-3">
                    {new Date(line.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">{fmt(line.principal_cents)}</td>
                  <td className="px-6 py-3">{fmt(line.interest_cents)}</td>
                  <td className="px-6 py-3">{fmt(line.fee_cents)}</td>
                  <td className="px-6 py-3 font-medium">
                    {fmt(line.principal_cents + line.interest_cents + line.fee_cents)}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        SCHEDULE_COLORS[line.status] ?? "bg-border/30 text-muted"
                      }`}
                    >
                      {line.status}
                      {line.paid_at
                        ? ` · ${new Date(line.paid_at).toLocaleDateString()}`
                        : ""}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
