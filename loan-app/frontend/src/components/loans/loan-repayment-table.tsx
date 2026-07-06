"use client";

import { useCallback } from "react";
import { DataTable } from "@/components/blnk-ui/data-table";
import { repaymentPreviewColumns } from "@/components/loans/loan-repayment-columns";
import { LoanRepaymentFullModal } from "@/components/loans/loan-repayment-full-modal";
import {
  buildCloudTransactionsByRepaymentIdUrl,
  navigateToCloud,
} from "@/lib/blnk-cloud-links";
import type { LoanRepaymentLine } from "@/lib/loans/types";
import { usePortalSession } from "@/lib/portal-session";

const PREVIEW_ROW_COUNT = 6;

export { PREVIEW_ROW_COUNT as REPAYMENT_PREVIEW_ROW_COUNT };

type LoanRepaymentTableProps = {
  repayments: LoanRepaymentLine[];
  fullRepaymentOpen: boolean;
  onFullRepaymentOpenChange: (open: boolean) => void;
};

export function LoanRepaymentTable({
  repayments,
  fullRepaymentOpen,
  onFullRepaymentOpenChange,
}: LoanRepaymentTableProps) {
  const { blnkCloudApiOrigin } = usePortalSession();
  const hasMore = repayments.length > PREVIEW_ROW_COUNT;
  const previewRepayments = hasMore
    ? repayments.slice(0, PREVIEW_ROW_COUNT)
    : repayments;

  const handleRepaymentSelect = useCallback(
    (repayment: LoanRepaymentLine) => {
      navigateToCloud(
        buildCloudTransactionsByRepaymentIdUrl(
          blnkCloudApiOrigin,
          repayment.loan_repayment_id
        )
      );
    },
    [blnkCloudApiOrigin]
  );

  return (
    <>
      <div className="overflow-x-auto">
        <DataTable
          columns={repaymentPreviewColumns}
          data={previewRepayments}
          fixedWidths
          lastColumnFill
          stickyActionsRight={false}
          cellPaddingClassName="py-1.5"
          getRowId={(row) => row.loan_repayment_id}
          onSelect={handleRepaymentSelect}
        />
      </div>

      {hasMore ? (
        <LoanRepaymentFullModal
          open={fullRepaymentOpen}
          repayments={repayments}
          onOpenChange={onFullRepaymentOpenChange}
          onSelectRepayment={handleRepaymentSelect}
        />
      ) : null}
    </>
  );
}
