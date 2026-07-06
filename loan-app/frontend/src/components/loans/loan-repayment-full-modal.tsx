"use client";

import { DataTable } from "@/components/blnk-ui/data-table";
import { repaymentFullColumns } from "@/components/loans/loan-repayment-columns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LoanRepaymentLine } from "@/lib/loans/types";

/** Rows scroll beyond this; modal header stays fixed. */
const REPAYMENT_MODAL_BODY_MAX_HEIGHT = "min(60vh, calc(100dvh - 14rem))";

type LoanRepaymentFullModalProps = {
  open: boolean;
  repayments: LoanRepaymentLine[];
  onOpenChange: (open: boolean) => void;
  onSelectRepayment: (repayment: LoanRepaymentLine) => void;
};

export function LoanRepaymentFullModal({
  open,
  repayments,
  onOpenChange,
  onSelectRepayment,
}: LoanRepaymentFullModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-5xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Repayments</DialogTitle>
          <DialogDescription>
            Full repayment history for this loan.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          <DataTable
            columns={repaymentFullColumns}
            data={repayments}
            fixedWidths
            lastColumnFill={false}
            stickyActionsRight={false}
            cellPaddingClassName="py-1.5"
            scrollBody
            bodyMaxHeight={REPAYMENT_MODAL_BODY_MAX_HEIGHT}
            getRowId={(row) => row.loan_repayment_id}
            onSelect={onSelectRepayment}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
