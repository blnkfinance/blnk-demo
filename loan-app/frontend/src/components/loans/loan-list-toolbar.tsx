"use client";

import FilterCard from "@/components/blnk-ui/filter-card";
import PlusIcon from "@/components/blnk-icons/plus-icon";
import { Button } from "@/components/ui/button";
import { formatNumberWithCommas } from "@/lib/format";
import type { LoanStatus } from "@/lib/loans/types";

type LoanListToolbarProps = {
  status: LoanStatus;
  onStatusChange: (status: LoanStatus) => void;
  onCreateLoan: () => void;
  counts: Record<LoanStatus, number>;
};

const tabs: { value: LoanStatus; label: string }[] = [
  { value: "approved", label: "Approved" },
  { value: "pending_approval", label: "Pending" },
  { value: "rejected", label: "Rejected" },
];

export function LoanListToolbar({
  status,
  onStatusChange,
  onCreateLoan,
  counts,
}: LoanListToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-nowrap gap-2 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <FilterCard
            key={tab.value}
            title={tab.label}
            sub={formatNumberWithCommas(counts[tab.value])}
            selected={status === tab.value}
            onClick={() => onStatusChange(tab.value)}
          />
        ))}
      </div>

      <Button
        type="button"
        size="sm"
        className="h-8 shrink-0 gap-1.5 rounded-md bg-platform-button-main-bg px-2 py-1.5 text-platform-primary-text hover:bg-platform-button-main-bg/90"
        onClick={onCreateLoan}
      >
        <PlusIcon />
        <span className="text-sm font-medium">Create loan</span>
      </Button>
    </div>
  );
}
