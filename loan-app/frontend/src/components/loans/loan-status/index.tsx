"use client";

import TransactionAppliedIcon from "@/components/blnk-icons/transaction-applied-icon";
import TransactionInflightIcon from "@/components/blnk-icons/transaction-inflight-icon";
import TransactionRejectedIcon from "@/components/blnk-icons/transaction-rejected-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LOAN_STATUS_LABELS } from "@/lib/loans/labels";
import type { LoanStatus } from "@/lib/loans/types";

type LoanStatusPillProps = {
  status: LoanStatus;
  className?: string;
};

export default function LoanStatusPill({ status, className }: LoanStatusPillProps) {
  const label = LOAN_STATUS_LABELS[status];

  const icon =
    status === "approved" ? (
      <TransactionAppliedIcon className="shrink-0" />
    ) : status === "rejected" ? (
      <TransactionRejectedIcon className="shrink-0" />
    ) : (
      <TransactionInflightIcon className="shrink-0" />
    );

  const textColor =
    status === "approved"
      ? "text-platform-custom-green"
      : status === "rejected"
        ? "text-platform-custom-red"
        : "text-[#FFCB2C]";

  const tooltip =
    status === "approved"
      ? "This loan has been approved."
      : status === "rejected"
        ? "This loan was rejected."
        : "This loan is awaiting approval.";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`inline-flex items-center justify-start gap-1 whitespace-nowrap rounded-full border border-platform-stroke bg-platform-main-bg px-2 py-1.5 ${className ?? ""}`}
          >
            {icon}
            <span className={`shrink-0 text-xs font-medium ${textColor}`}>{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent align="start" className="max-w-xs">
          <p className="text-sm leading-snug">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
