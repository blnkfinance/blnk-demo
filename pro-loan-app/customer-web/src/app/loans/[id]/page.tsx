import { api } from "@/lib/api";
import { RepayButton } from "./RepayButton";

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
  status: string;
  principal_cents: number;
  currency: string;
  term_months: number;
  annual_interest_bps: number;
  origination_fee_bps: number;
  disbursement_breakdown?: {
    requested_principal_cents: number;
    origination_fee_cents: number;
    net_disbursement_cents: number;
    currency: string;
  };
  schedule: ScheduleLine[];
  created_at: string;
  approved_at?: string;
  disbursed_at?: string;
  rejected_at?: string;
  rejection_note?: string;
};

async function getLoan(id: string) {
  return api.get<Loan>(`/loans/${id}`);
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-border/30 text-muted",
  submitted: "bg-warning/10 text-warning",
  approved: "bg-info/10 text-info",
  active: "bg-success/10 text-success",
  rejected: "bg-error/10 text-error",
  closed: "bg-border/30 text-muted",
};

const SCHEDULE_COLORS: Record<string, string> = {
  scheduled: "bg-border/30 text-muted",
  due: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
  overdue: "bg-error/10 text-error",
  void: "bg-border/30 text-muted",
};

const STATUS_MESSAGES: Record<string, string> = {
  draft: "Your application is saved as a draft.",
  submitted: "Your application has been submitted and is under review.",
  approved: "Your loan has been approved and will be disbursed shortly.",
  active: "Your loan is active. Make repayments as scheduled.",
  rejected: "Your application was not approved at this time.",
  closed: "This loan has been fully repaid and closed.",
};

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const loan = await getLoan(id);

  const schedule = loan.schedule ?? [];
  const paidCount = schedule.filter((l) => l.status === "paid").length;
  const totalCount = schedule.length;
  const overdueCount = schedule.filter((l) => l.status === "overdue").length;
  const nextDue = schedule.find(
    (l) => l.status === "due" || l.status === "overdue" || l.status === "scheduled"
  );

  function fmt(cents: number) {
    return `${loan.currency} ${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <a href="/loans" className="text-sm text-secondary hover:underline">
            ← Back to loans
          </a>
          <h1 className="mt-2 text-2xl font-bold text-ink">
            {fmt(loan.principal_cents)} loan
          </h1>
          <p className="text-xs text-muted font-mono">{loan.id}</p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
            STATUS_COLORS[loan.status] ?? "bg-border/30"
          }`}
        >
          {loan.status}
        </span>
      </div>

      {/* Status banner */}
      <div className="card p-5">
        <p className="text-sm text-muted">
          {STATUS_MESSAGES[loan.status] ?? loan.status}
        </p>
        {loan.rejection_note && (
          <p className="mt-2 text-sm font-medium text-error">
            Reason: {loan.rejection_note}
          </p>
        )}
      </div>

      {loan.disbursement_breakdown && (
        <div className="card p-5">
          <h2 className="font-semibold text-ink mb-3">Disbursement breakdown</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Requested</span>
              <span>{fmt(loan.disbursement_breakdown.requested_principal_cents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Origination fee</span>
              <span className="text-error">
                −{fmt(loan.disbursement_breakdown.origination_fee_cents)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-2 font-semibold">
              <span>Net disbursed to wallet</span>
              <span className="text-secondary">
                {fmt(loan.disbursement_breakdown.net_disbursement_cents)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-muted">Principal</p>
          <p className="mt-1 text-lg font-bold text-ink">
            {fmt(loan.principal_cents)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">Term</p>
          <p className="mt-1 text-lg font-bold text-ink">
            {loan.term_months}mo
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">Rate</p>
          <p className="mt-1 text-lg font-bold text-ink">
            {(loan.annual_interest_bps / 100).toFixed(2)}% pa
          </p>
        </div>
        {totalCount > 0 && (
          <div className="card p-4">
            <p className="text-xs text-muted">Paid</p>
            <p className="mt-1 text-lg font-bold text-ink">
              {paidCount}/{totalCount}
            </p>
          </div>
        )}
      </div>

      {overdueCount > 0 && (
        <div className="rounded-xl bg-error/10 px-4 py-3 ring-1 ring-error/30">
          <p className="text-sm font-medium text-error">
            ⚠ You have {overdueCount} overdue payment
            {overdueCount > 1 ? "s" : ""}. Please repay as soon as possible.
          </p>
        </div>
      )}

      {/* Next payment due + repay CTA */}
      {nextDue && loan.status === "active" && (
        <div className="rounded-xl bg-success/10 px-4 py-3 ring-1 ring-success/30">
          <p className="text-sm text-muted">Next payment due</p>
          <p className="text-lg font-bold text-success">
            {fmt(
              nextDue.principal_cents + nextDue.interest_cents + nextDue.fee_cents
            )}
          </p>
          <p className="text-xs text-muted">
            {new Date(nextDue.due_date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          {nextDue.status !== "paid" && (
            <RepayButton loanId={loan.id} label="Repay Now" />
          )}
        </div>
      )}

      {totalCount > 0 && (
        <div className="card">
          <div className="border-b border-border/60 px-6 py-4">
            <h2 className="font-semibold text-ink">Repayment schedule</h2>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted mb-1">
                <span>Progress</span>
                <span>{paidCount}/{totalCount} instalments paid</span>
              </div>
              <div className="h-2 rounded-full bg-border/30">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-secondary to-emerald-400 transition-all"
                  style={{ width: `${(paidCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Due date</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {schedule.map((line, i) => (
                <tr key={line.id} className="hover:bg-surface-card/50 transition-colors">
                  <td className="px-6 py-3 text-muted">{i + 1}</td>
                  <td className="px-6 py-3">
                    {new Date(line.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 font-medium">
                    {fmt(line.principal_cents + line.interest_cents + line.fee_cents)}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        SCHEDULE_COLORS[line.status] ?? "bg-border/30"
                      }`}
                    >
                      {line.status}
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
