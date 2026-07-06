"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/blnk-ui/data-table";
import { loanLedgerTransactionColumns } from "@/components/loans/loan-ledger-transaction-columns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listLoanLedgerTransactions } from "@/lib/loans/api";
import type { LoanLedgerTransaction, LoanLedgerTransactionKind } from "@/lib/loans/types";
import { showLoadError } from "@/lib/toast";

const MODAL_BODY_MAX_HEIGHT = "min(60vh, calc(100dvh - 14rem))";

const MODAL_COPY: Record<
  LoanLedgerTransactionKind,
  { title: string; description: string }
> = {
  interest_accrual: {
    title: "Accrued interest",
    description: "Daily interest accrual transactions posted for this loan.",
  },
  principal_repayment: {
    title: "Principal payments",
    description: "Principal repayment legs posted against this loan.",
  },
};

type LoanLedgerTransactionsModalProps = {
  open: boolean;
  kind: LoanLedgerTransactionKind | null;
  loanId: string;
  token: string;
  onOpenChange: (open: boolean) => void;
};

export function LoanLedgerTransactionsModal({
  open,
  kind,
  loanId,
  token,
  onOpenChange,
}: LoanLedgerTransactionsModalProps) {
  const [transactions, setTransactions] = useState<LoanLedgerTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !kind) {
      setTransactions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void listLoanLedgerTransactions(token, loanId, kind).then((result) => {
      if (cancelled) return;
      setLoading(false);

      if (!result.ok) {
        showLoadError("ledger transactions", result.message);
        setTransactions([]);
        return;
      }

      setTransactions(result.data.transactions);
    });

    return () => {
      cancelled = true;
    };
  }, [open, kind, loanId, token]);

  const copy = kind ? MODAL_COPY[kind] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-4xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>{copy?.title ?? "Ledger transactions"}</DialogTitle>
          <DialogDescription>
            {copy?.description ?? "Transactions for this loan."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          {loading ? (
            <p className="py-8 text-center text-sm text-platform-muted">Loading…</p>
          ) : (
            <DataTable
              columns={loanLedgerTransactionColumns}
              data={transactions}
              fixedWidths
              lastColumnFill={false}
              stickyActionsRight={false}
              cellPaddingClassName="py-1.5"
              scrollBody
              bodyMaxHeight={MODAL_BODY_MAX_HEIGHT}
              getRowId={(row) => row.transaction_id}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
