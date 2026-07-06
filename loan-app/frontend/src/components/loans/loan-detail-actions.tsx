"use client";

import { useState } from "react";
import {
  ActionsDropdown,
  type ActionsDropdownItem,
} from "@/components/blnk-ui/actions-dropdown";
import TransactionAppliedIcon from "@/components/blnk-icons/transaction-applied-icon";
import TransactionRejectedIcon from "@/components/blnk-icons/transaction-rejected-icon";
import { approveLoan, rejectLoan } from "@/lib/loans/api";
import type { Loan, ScheduleLine } from "@/lib/loans/types";
import { showActionError, showSuccessToast } from "@/lib/toast";

type LoanDetailActionsProps = {
  token: string;
  loan: Loan;
  onLoanUpdated: (loan: Loan) => void;
  onLoanApproved: (result: { loan: Loan; schedule: ScheduleLine[] }) => void;
};

const mutedIconProps = { fill: "currentColor" } as const;

export function LoanDetailActions({
  token,
  loan,
  onLoanUpdated,
  onLoanApproved,
}: LoanDetailActionsProps) {
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

    onLoanApproved({ loan: result.loan, schedule: result.schedule });
    showSuccessToast("Loan approved", "The loan application has been approved.");
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
    onLoanUpdated(result.loan);
  }

  const items: ActionsDropdownItem[] = [
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
    />
  );
}
