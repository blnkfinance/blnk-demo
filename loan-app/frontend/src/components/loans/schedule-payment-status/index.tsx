"use client";

import TransactionAppliedIcon from "@/components/blnk-icons/transaction-applied-icon";
import TransactionInflightIcon from "@/components/blnk-icons/transaction-inflight-icon";
import TransactionRejectedIcon from "@/components/blnk-icons/transaction-rejected-icon";
import TransactionScheduledIcon from "@/components/blnk-icons/transaction-scheduled-icon";
import TransactionVoidIcon from "@/components/blnk-icons/transaction-void-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SCHEDULE_PAYMENT_STATUS_LABELS } from "@/lib/loans/labels";
import type { SchedulePaymentStatus } from "@/lib/loans/types";

type SchedulePaymentStatusPillProps = {
  status: SchedulePaymentStatus;
  className?: string;
};

function getStatusIcon(status: SchedulePaymentStatus) {
  switch (status) {
    case "paid":
      return <TransactionAppliedIcon className="shrink-0" />;
    case "due":
      return <TransactionInflightIcon className="shrink-0" />;
    case "overdue":
      return <TransactionRejectedIcon className="shrink-0" />;
    case "void":
      return <TransactionVoidIcon className="shrink-0" />;
    case "scheduled":
    default:
      return <TransactionScheduledIcon className="shrink-0" />;
  }
}

function getTextColor(status: SchedulePaymentStatus) {
  switch (status) {
    case "paid":
      return "text-platform-custom-green";
    case "due":
      return "text-[#FFCB2C]";
    case "overdue":
      return "text-platform-custom-red";
    case "void":
      return "text-platform-custom-purple-void";
    case "scheduled":
    default:
      return "text-[#80C5F9]";
  }
}

function getTooltip(status: SchedulePaymentStatus) {
  switch (status) {
    case "paid":
      return "This installment has been paid.";
    case "due":
      return "This installment is due for payment.";
    case "overdue":
      return "This installment is overdue.";
    case "void":
      return "This installment has been voided.";
    case "scheduled":
    default:
      return "This installment is scheduled for payment.";
  }
}

export default function SchedulePaymentStatusPill({
  status,
  className,
}: SchedulePaymentStatusPillProps) {
  const label = SCHEDULE_PAYMENT_STATUS_LABELS[status] ?? status;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`inline-flex max-w-full items-center justify-start gap-1 whitespace-nowrap rounded-full border border-platform-stroke bg-platform-main-bg px-2 py-1.5 ${className ?? ""}`}
          >
            {getStatusIcon(status)}
            <span className={`shrink-0 text-xs font-medium ${getTextColor(status)}`}>
              {label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent align="start" className="max-w-xs">
          <p className="text-sm leading-snug">{getTooltip(status)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
