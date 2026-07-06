"use client";

import { DataTable } from "@/components/blnk-ui/data-table";
import { scheduleFullColumns } from "@/components/loans/loan-schedule-columns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ScheduleLine } from "@/lib/loans/types";

/** Rows scroll beyond this; modal header stays fixed. */
const SCHEDULE_MODAL_BODY_MAX_HEIGHT = "min(60vh, calc(100dvh - 14rem))";

type LoanScheduleFullModalProps = {
  open: boolean;
  schedule: ScheduleLine[];
  onOpenChange: (open: boolean) => void;
  onSelectLine: (line: ScheduleLine) => void;
};

export function LoanScheduleFullModal({
  open,
  schedule,
  onOpenChange,
  onSelectLine,
}: LoanScheduleFullModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-5xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Payment schedule</DialogTitle>
          <DialogDescription>
            Full expected payment schedule with EIR amortization per period.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          <DataTable
            columns={scheduleFullColumns}
            data={schedule}
            fixedWidths
            lastColumnFill={false}
            stickyActionsRight={false}
            cellPaddingClassName="py-1.5"
            scrollBody
            bodyMaxHeight={SCHEDULE_MODAL_BODY_MAX_HEIGHT}
            getRowId={(row) => row.loan_schedule_id}
            onSelect={onSelectLine}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
