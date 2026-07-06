"use client";

import { DataTable } from "@/components/blnk-ui/data-table";
import EmptyState from "@/components/blnk-ui/empty-state";
import IdentityIcon from "@/components/blnk-icons/identity-icon";
import LoanStatusPill from "@/components/loans/loan-status";
import { LoanTableRowActions } from "@/components/loans/loan-table-row-actions";
import { formatTableDate } from "@/lib/format";
import { formatIdentityName } from "@/lib/identities/format";
import { formatMoney } from "@/lib/loans/labels";
import { LoanTableSkeleton } from "./loans-page-skeleton";
import type { LoanTableRow } from "./loan-table-columns";
import { loanColumns } from "./loan-table-columns";

type LoanTableProps = {
  loans: LoanTableRow[];
  loading?: boolean;
  onRowClick: (loan: LoanTableRow) => void;
  onCreateLoan?: () => void;
  token?: string;
  showRowActions?: boolean;
  onLoanUpdated?: () => void;
};

function LoansIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path
        d="M4.16667 5.83333C4.16667 4.91286 4.91286 4.16667 5.83333 4.16667H14.1667C15.0871 4.16667 15.8333 4.91286 15.8333 5.83333V14.1667C15.8333 15.0871 15.0871 15.8333 14.1667 15.8333H5.83333C4.91286 15.8333 4.16667 15.0871 4.16667 14.1667V5.83333Z"
        stroke="#566873"
        strokeWidth="1.25"
      />
      <path
        d="M7.5 8.33333H12.5M7.5 11.6667H10.8333"
        stroke="#566873"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LoanTable({
  loans,
  loading,
  onRowClick,
  onCreateLoan,
  token,
  showRowActions = false,
  onLoanUpdated,
}: LoanTableProps) {
  if (loading) {
    return <LoanTableSkeleton />;
  }

  if (loans.length === 0) {
    return (
      <EmptyState
        icon={<LoansIcon />}
        title="No loans to show!"
        maxWidth="max-w-[230px]"
        description="Create a loan or switch tabs to see results."
        actionButton={
          onCreateLoan
            ? { text: "Create loan", onClick: onCreateLoan }
            : undefined
        }
      />
    );
  }

  return (
    <DataTable
      columns={loanColumns}
      data={loans}
      onSelect={onRowClick}
      fixedWidths
      lastColumnFill
      stickyActionsRight={false}
      cellPaddingClassName="py-1.5"
      getRowId={(row) => row.loan_id}
      renderActions={
        showRowActions && token && onLoanUpdated
          ? (loan) => (
              <LoanTableRowActions
                token={token}
                loan={loan}
                onViewDetails={onRowClick}
                onLoanUpdated={onLoanUpdated}
              />
            )
          : undefined
      }
      renderMobileCard={(loan) => (
        <div className="flex items-center gap-3">
          <IdentityIcon color="#566873" className="h-4 w-4 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-platform-primary-text truncate">
              {loan.customer ? formatIdentityName(loan.customer) : "—"}
            </p>
            <p className="text-xs text-platform-muted mt-0.5">
              {formatMoney(loan.principal)}
              {" · "}
              {formatTableDate(loan.created_at)}
            </p>
          </div>
          <div className="shrink-0">
            <LoanStatusPill status={loan.status} />
          </div>
        </div>
      )}
    />
  );
}
