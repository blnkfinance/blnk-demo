"use client";

import type { CellContext, ColumnDef } from "@tanstack/react-table";
import FormattedDate from "@/components/blnk-ui/formatted-date";
import { formatDisplayDate } from "@/lib/format";
import { formatMoney } from "@/lib/loans/labels";
import type { LoanLedgerTransaction } from "@/lib/loans/types";

const moneyColumnWidth = "140px";

function rightAlignedHeader(label: string) {
  return () => <span className="block w-full text-right">{label}</span>;
}

function transactionDate(row: LoanLedgerTransaction): string {
  return row.accrual_date ?? row.created_at;
}

export const loanLedgerTransactionColumns = [
  {
    id: "date",
    accessorKey: "created_at",
    header: "Date",
    width: "140px",
    cell: ({ row }: CellContext<LoanLedgerTransaction, unknown>) => {
      const value = transactionDate(row.original);
      return value.includes("T") ? (
        <FormattedDate value={value} />
      ) : (
        formatDisplayDate(value)
      );
    },
  },
  {
    accessorKey: "period",
    header: "Period",
    width: "80px",
    cell: ({ row }: CellContext<LoanLedgerTransaction, unknown>) =>
      row.original.period != null ? (
        <span className="tabular-nums">{row.original.period}</span>
      ) : (
        <span className="text-platform-muted">—</span>
      ),
  },
  {
    accessorKey: "amount",
    header: rightAlignedHeader("Amount"),
    width: moneyColumnWidth,
    cell: ({ row }: CellContext<LoanLedgerTransaction, unknown>) => (
      <span className="block text-right tabular-nums">
        {formatMoney(row.original.amount)}
      </span>
    ),
  },
  {
    accessorKey: "reference",
    header: "Reference",
    width: "220px",
    cell: ({ row }: CellContext<LoanLedgerTransaction, unknown>) =>
      row.original.reference ?? <span className="text-platform-muted">—</span>,
  },
] as unknown as ColumnDef<LoanLedgerTransaction>[];
