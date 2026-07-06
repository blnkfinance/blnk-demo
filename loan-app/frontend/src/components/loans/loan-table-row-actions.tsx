"use client";

import { useState } from "react";
import {
  ActionsDropdown,
  type ActionsDropdownItem,
} from "@/components/blnk-ui/actions-dropdown";
import CircleInfoIcon from "@/components/blnk-icons/circle-info-icon";
import TransactionAppliedIcon from "@/components/blnk-icons/transaction-applied-icon";
import TransactionRejectedIcon from "@/components/blnk-icons/transaction-rejected-icon";
import { approveLoan, rejectLoan } from "@/lib/loans/api";
import type { LoanTableRow } from "@/components/loans/loan-table-columns";
import { showActionError, showSuccessToast } from "@/lib/toast";

type LoanTableRowActionsProps = {
  token: string;
  loan: LoanTableRow;
  onViewDetails: (loan: LoanTableRow) => void;
  onLoanUpdated: () => void;
};

const mutedIconProps = { fill: "currentColor" } as const;

export function LoanTableRowActions({
  token,
  loan,
  onViewDetails,
  onLoanUpdated,
}: LoanTableRowActionsProps) {
  const [busyItemKey, setBusyItemKey] = useState<string | null>(null);

  if (loan.status !== "pending_approval") {
    return null;
  }

  async function handleApprove() {
    setBusyItemKey("approve");
    const result = await approveLoan(token, loan.loan_id);
    setBusyItemKey(null);

    if (!result.ok) {
      showActionError({ action: "approve loan", message: result.message });
      return;
    }

    showSuccessToast("Loan approved", "The loan application has been approved.");
    onLoanUpdated();
  }

  async function handleReject() {
    setBusyItemKey("reject");
    const result = await rejectLoan(token, loan.loan_id);
    setBusyItemKey(null);

    if (!result.ok) {
      showActionError({ action: "reject loan", message: result.message });
      return;
    }

    showSuccessToast("Loan rejected", "The loan application has been rejected.");
    onLoanUpdated();
  }

  const items: ActionsDropdownItem[] = [
    {
      key: "view-details",
      icon: <CircleInfoIcon {...mutedIconProps} />,
      label: "View details",
      onClick: () => onViewDetails(loan),
    },
    {
      key: "approve",
      icon: <TransactionAppliedIcon {...mutedIconProps} />,
      label: "Approve",
      onClick: handleApprove,
    },
    {
      key: "reject",
      icon: <TransactionRejectedIcon {...mutedIconProps} />,
      label: "Reject",
      onClick: handleReject,
    },
  ];

  return (
    <ActionsDropdown
      items={items}
      isBusy={busyItemKey != null}
      busyItemKey={busyItemKey}
      menuAlign="right"
      trigger="ellipsis"
    />
  );
}
