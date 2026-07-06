"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoanCreateSheet } from "@/components/loans/loan-create-sheet";
import { LoanListToolbar } from "@/components/loans/loan-list-toolbar";
import { LoanTable } from "@/components/loans/loan-table";
import type { LoanTableRow } from "@/components/loans/loan-table-columns";
import SectionHeader from "@/components/blnk-ui/section-header";
import { listLoans } from "@/lib/loans/api";
import { DEFAULT_LOAN_LIST_STATUS, loansListPath, parseLoanListStatus } from "@/lib/loans/list-route";
import type { LoanStatus, SheetMode } from "@/lib/loans/types";
import { withToken } from "@/lib/portal-token";
import { showLoadError } from "@/lib/toast";

export default function LoansPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<LoanStatus>(
    () => parseLoanListStatus(searchParams.get("status")) ?? DEFAULT_LOAN_LIST_STATUS
  );
  const [loans, setLoans] = useState<LoanTableRow[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<LoanStatus, number>>({
    pending_approval: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sheetMode, setSheetMode] = useState<SheetMode>("closed");

  const loadLoans = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const result = await listLoans(token, { status, include_customer: true });
    setLoading(false);
    if (!result.ok) {
      showLoadError("loans", result.message);
      setLoans([]);
      return;
    }
    setLoans(result.data.loans);
    setTabCounts((prev) => ({ ...prev, [status]: result.data.total }));
  }, [token, status]);

  const loadTabCounts = useCallback(async () => {
    if (!token) return;
    const [pending, approved, rejected] = await Promise.all([
      listLoans(token, { status: "pending_approval", limit: 1 }),
      listLoans(token, { status: "approved", limit: 1 }),
      listLoans(token, { status: "rejected", limit: 1 }),
    ]);
    setTabCounts({
      pending_approval: pending.ok ? pending.data.total : 0,
      approved: approved.ok ? approved.data.total : 0,
      rejected: rejected.ok ? rejected.data.total : 0,
    });
  }, [token]);

  useEffect(() => {
    const fromUrl = parseLoanListStatus(searchParams.get("status"));
    if (fromUrl && fromUrl !== status) {
      setStatus(fromUrl);
      setLoans([]);
      setLoading(true);
    }
  }, [searchParams, status]);

  useEffect(() => {
    void loadLoans();
  }, [loadLoans]);

  useEffect(() => {
    void loadTabCounts();
  }, [loadTabCounts]);

  function handleStatusChange(next: LoanStatus) {
    if (next === status) return;
    if (token) {
      router.replace(withToken(loansListPath(next), token));
    }
    setStatus(next);
    setLoans([]);
    setLoading(true);
  }

  function handleRowClick(loan: LoanTableRow) {
    if (!token) return;
    router.push(
      withToken(`/loans/${loan.loan_id}?list_status=${status}`, token)
    );
  }

  function handleCreated(loanId: string) {
    setSheetMode("closed");
    if (token) {
      router.push(
        withToken(
          `/loans/${loanId}?list_status=pending_approval`,
          token
        )
      );
    }
  }

  if (!token) {
    return null;
  }

  return (
    <>
      <div className="hidden">
        <SectionHeader
          title="Loans"
          subtitle="Review, approve, and manage loan applications."
        />
      </div>

      <div className="space-y-4">
        <LoanListToolbar
          status={status}
          onStatusChange={handleStatusChange}
          onCreateLoan={() => setSheetMode("create")}
          counts={tabCounts}
        />

        <LoanTable
          loans={loans}
          loading={loading}
          onRowClick={handleRowClick}
          onCreateLoan={() => setSheetMode("create")}
          token={token}
          showRowActions={status === "pending_approval"}
          onLoanUpdated={() => {
            void loadLoans();
            void loadTabCounts();
          }}
        />
      </div>

      <LoanCreateSheet
        token={token}
        mode={sheetMode}
        onClose={() => setSheetMode("closed")}
        onCreated={handleCreated}
      />
    </>
  );
}
