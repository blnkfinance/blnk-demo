"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveLoanAction,
  rejectLoanAction,
  disburseLoanAction,
  commitDisbursementAction,
  voidDisbursementAction,
  recordPaymentAction,
} from "@/lib/loan-actions";

type ScheduleLine = {
  id: string;
  due_date: string;
  principal_cents: number;
  interest_cents: number;
  fee_cents: number;
  status: string;
};

type Props = {
  loanId: string;
  status: string;
  currency: string;
  committedAt?: string;
  schedule?: ScheduleLine[] | null;
};

export default function LoanActions({
  loanId,
  status,
  currency,
  committedAt,
  schedule: rawSchedule,
}: Props) {
  const schedule = rawSchedule ?? [];
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);

  async function run(action: () => Promise<{ success: true } | { error: string }>) {
    setError("");
    setLoading(true);
    try {
      const result = await action();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const canApprove = status === "draft" || status === "submitted";
  const canReject = status === "draft" || status === "submitted";
  const canDisburse = status === "approved";
  const canCommit = status === "active" && !committedAt;
  const canVoid = status === "active" && !committedAt;

  const unpaidLines = schedule.filter(
    (l) => l.status === "due" || l.status === "overdue" || l.status === "scheduled"
  );

  function fmt(cents: number) {
    return `${currency} ${(cents / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    })}`;
  }

  const hasAnyAction =
    canApprove || canReject || canDisburse || canCommit || canVoid || unpaidLines.length > 0;

  if (!hasAnyAction) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Primary lifecycle actions */}
      {(canApprove || canReject || canDisburse || canCommit || canVoid) && (
        <div className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
          <h2 className="mb-4 font-semibold text-ink">Loan actions</h2>
          <div className="flex flex-wrap gap-3">
            {canApprove && (
              <button
                onClick={() => run(() => approveLoanAction(loanId))}
                disabled={loading}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50 transition-colors"
              >
                Approve
              </button>
            )}
            {canDisburse && (
              <button
                onClick={() => run(() => disburseLoanAction(loanId))}
                disabled={loading}
                className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/90 disabled:opacity-50 transition-colors"
              >
                Disburse (create inflight)
              </button>
            )}
            {canCommit && (
              <button
                onClick={() => run(() => commitDisbursementAction(loanId))}
                disabled={loading}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-success/90 disabled:opacity-50 transition-colors"
              >
                Commit disbursement
              </button>
            )}
            {canVoid && !showVoidConfirm && (
              <button
                onClick={() => setShowVoidConfirm(true)}
                disabled={loading}
                className="rounded-lg bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600 ring-1 ring-orange-200 hover:bg-orange-100 transition-colors"
              >
                Void disbursement
              </button>
            )}
            {canReject && !showReject && (
              <button
                onClick={() => setShowReject(true)}
                className="rounded-lg bg-error/10 px-4 py-2 text-sm font-semibold text-error ring-1 ring-error/30 hover:bg-error/20 transition-colors"
              >
                Reject
              </button>
            )}
          </div>

          {showVoidConfirm && (
            <div className="mt-4 rounded-xl bg-orange-50 p-4 ring-1 ring-orange-200">
              <p className="text-sm text-orange-700 mb-3">
                This will void the Blnk inflight transaction and revert the loan to
                approved status. The reserved funds will be released. Are you sure?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowVoidConfirm(false);
                    run(() => voidDisbursementAction(loanId));
                  }}
                  disabled={loading}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  Confirm void
                </button>
                <button
                  onClick={() => setShowVoidConfirm(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-border/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {showReject && (
            <div className="mt-4 flex flex-col gap-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Rejection reason…"
                rows={3}
                className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    run(() => rejectLoanAction(loanId, rejectReason))
                  }
                  disabled={loading}
                  className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white hover:bg-error/90 disabled:opacity-50 transition-colors"
                >
                  Confirm rejection
                </button>
                <button
                  onClick={() => setShowReject(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-border/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-error/30">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Schedule line payment — shown for active loans with unpaid lines */}
      {unpaidLines.length > 0 && (
        <div className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
          <h2 className="mb-4 font-semibold text-ink">Record payment</h2>
          <p className="mb-3 text-xs text-muted">
            Mark a repayment instalment as paid and post the corresponding Blnk
            transaction.
          </p>
          <div className="flex flex-col gap-2">
            {unpaidLines.map((line) => {
              const total =
                line.principal_cents + line.interest_cents + line.fee_cents;
              const isOverdue = line.status === "overdue";
              const isDue = line.status === "due";
              const originalIndex = schedule.findIndex((l) => l.id === line.id);
              return (
                <div
                  key={line.id}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">
                      Instalment {originalIndex + 1} · {fmt(total)}
                    </p>
                    <p className="text-xs text-muted">
                      Due {new Date(line.due_date).toLocaleDateString()}
                      {isOverdue && (
                        <span className="ml-2 text-error font-medium">
                          OVERDUE
                        </span>
                      )}
                      {isDue && (
                        <span className="ml-2 text-warning font-medium">
                          DUE
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      run(() => recordPaymentAction(loanId, line.id))
                    }
                    disabled={loading}
                    className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white hover:bg-success/90 disabled:opacity-50 transition-colors"
                  >
                    Mark paid
                  </button>
                </div>
              );
            })}
          </div>
          {error && (
            <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-error/30">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
