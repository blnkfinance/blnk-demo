import { cookies } from "next/headers";
import { api } from "@/lib/api";
import Link from "next/link";
import { ApplyForm } from "./ApplyForm";

type LoanScheduleLine = {
  id: string;
  principal_cents: number;
  interest_cents: number;
  fee_cents: number;
  status: string;
  due_date: string;
  paid_at?: string;
};

type Loan = {
  id: string;
  status: string;
  principal_cents: number;
  currency: string;
  term_months: number;
  annual_interest_bps: number;
  schedule: LoanScheduleLine[] | null;
  created_at: string;
  disbursed_at?: string;
};

type Product = {
  id: string;
  name: string;
  currency: string;
  principal_min_cents: number;
  principal_max_cents: number;
  annual_interest_bps: number;
  origination_fee_bps: number;
  term_months: number;
};

async function getLoans(customerID: string) {
  try {
    return await api.get<{ data: Loan[]; total: number }>(
      `/loans?customer_id=${customerID}&page=1&page_size=50`
    );
  } catch {
    return { data: [], total: 0 };
  }
}

async function getProducts(): Promise<Product[]> {
  try {
    const res = await api.get<{ data: Product[] }>("/products");
    return res.data ?? [];
  } catch {
    return [];
  }
}

function formatMoney(currency: string, cents: number) {
  return `${currency} ${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-border/30 text-muted",
  submitted: "bg-warning/10 text-warning",
  approved: "bg-info/10 text-info",
  active: "bg-success/10 text-success",
  rejected: "bg-error/10 text-error",
  closed: "bg-border/30 text-muted",
};

export default async function LoansPage() {
  const jar = await cookies();
  const customerID = jar.get("customer_id")?.value ?? "";

  const [{ data: loans }, products] = await Promise.all([
    getLoans(customerID),
    getProducts(),
  ]);

  const blockingStatuses = ["draft", "submitted", "approved", "active"];
  const blockingLoan = loans.find((l) => blockingStatuses.includes(l.status));
  const blockingStatus = blockingLoan?.status ?? null;

  const activeLoans = loans.filter((l) => l.status === "active");
  const closedLoans = loans.filter(
    (l) => l.status === "closed" || l.status === "rejected"
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Loans</h1>
      </div>

      {/* Active Loans */}
      {activeLoans.length > 0 && (
        <section>
          <h2 className="mb-3 section-label">
            Active Loans
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeLoans.map((loan) => (
              <Link
                key={loan.id}
                href={`/loans/${loan.id}`}
                className="flex flex-col gap-3 card p-5 hover:ring-brand transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold text-ink">
                      {formatMoney(loan.currency, loan.principal_cents)}
                    </p>
                    <p className="text-xs text-muted">
                      {loan.term_months} months · {(loan.annual_interest_bps / 100).toFixed(1)}% pa
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[loan.status] ?? "bg-border/30 text-muted"
                    }`}
                  >
                    {loan.status}
                  </span>
                </div>
                {loan.schedule && loan.schedule.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted mb-1">
                      <span>Repayments</span>
                      <span>
                        {loan.schedule.filter((l) => l.status === "paid").length}/
                        {loan.schedule.length}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-card">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-secondary to-emerald-400 transition-all"
                        style={{
                          width: `${
                            (loan.schedule.filter((l) => l.status === "paid").length /
                              loan.schedule.length) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted">
                  Applied {new Date(loan.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {activeLoans.length === 0 && (
        <div className="card p-6">
          <p className="text-sm text-muted">No active loans.</p>
          <p className="mt-1 text-xs text-muted">
            Apply for a loan below to get started.
          </p>
        </div>
      )}

      {/* Loan History */}
      {closedLoans.length > 0 && (
        <section>
          <h2 className="mb-3 section-label">
            Loan History
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {closedLoans.map((loan) => (
              <Link
                key={loan.id}
                href={`/loans/${loan.id}`}
                className="flex flex-col gap-3 card p-5 hover:ring-border transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold text-ink">
                      {formatMoney(loan.currency, loan.principal_cents)}
                    </p>
                    <p className="text-xs text-muted">
                      {loan.term_months} months · {(loan.annual_interest_bps / 100).toFixed(1)}% pa
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[loan.status] ?? "bg-border/30 text-muted"
                    }`}
                  >
                    {loan.status}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Applied {new Date(loan.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Request a Loan */}
      <section>
        <h2 className="mb-3 section-label">
          Request a Loan
        </h2>
        <ApplyForm products={products} blockingStatus={blockingStatus} />
      </section>
    </div>
  );
}
