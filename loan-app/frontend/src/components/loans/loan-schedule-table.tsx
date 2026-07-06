"use client";

import { useState } from "react";
import { DataTable } from "@/components/blnk-ui/data-table";
import { LoanScheduleFullModal } from "@/components/loans/loan-schedule-full-modal";
import { schedulePreviewColumns } from "@/components/loans/loan-schedule-columns";
import { LoanScheduleLineSheet } from "@/components/loans/loan-schedule-line-sheet";
import type { Loan, LoanRepaymentLine, ScheduleLine } from "@/lib/loans/types";

const PREVIEW_ROW_COUNT = 6;

export { PREVIEW_ROW_COUNT as SCHEDULE_PREVIEW_ROW_COUNT };

type LoanScheduleTableProps = {
  loan: Loan;
  schedule: ScheduleLine[];
  token: string;
  onScheduleLineUpdated: (line: ScheduleLine) => void;
  onRepaymentAdded: (repayment: LoanRepaymentLine) => void;
  onLoanDetailRefresh: () => void;
  fullScheduleOpen: boolean;
  onFullScheduleOpenChange: (open: boolean) => void;
};

export function LoanScheduleTable({
  loan,
  schedule,
  token,
  onScheduleLineUpdated,
  onRepaymentAdded,
  onLoanDetailRefresh,
  fullScheduleOpen,
  onFullScheduleOpenChange,
}: LoanScheduleTableProps) {
  const [selectedLine, setSelectedLine] = useState<ScheduleLine | null>(null);

  const hasMore = schedule.length > PREVIEW_ROW_COUNT;
  const previewSchedule = hasMore
    ? schedule.slice(0, PREVIEW_ROW_COUNT)
    : schedule;

  return (
    <>
      <div className="overflow-x-auto">
        <DataTable
          columns={schedulePreviewColumns}
          data={previewSchedule}
          fixedWidths
          lastColumnFill
          stickyActionsRight={false}
          cellPaddingClassName="py-1.5"
          getRowId={(row) => row.loan_schedule_id}
          onSelect={setSelectedLine}
        />
      </div>

      {hasMore ? (
        <LoanScheduleFullModal
          open={fullScheduleOpen}
          schedule={schedule}
          onOpenChange={onFullScheduleOpenChange}
          onSelectLine={setSelectedLine}
        />
      ) : null}

      <LoanScheduleLineSheet
        line={selectedLine}
        loan={loan}
        token={token}
        onClose={() => setSelectedLine(null)}
        onScheduleLineUpdated={(line) => {
          onScheduleLineUpdated(line);
          setSelectedLine(line);
        }}
        onRepaymentAdded={onRepaymentAdded}
        onLoanDetailRefresh={onLoanDetailRefresh}
      />
    </>
  );
}
