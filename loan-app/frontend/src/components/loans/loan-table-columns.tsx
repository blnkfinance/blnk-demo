"use client";

import type { CellContext, ColumnDef } from "@tanstack/react-table";
import IdentityIcon from "@/components/blnk-icons/identity-icon";
import LoanStatusPill from "@/components/loans/loan-status";
import { formatDisplayDate, formatTableDate } from "@/lib/format";
import { formatIdentityName } from "@/lib/identities/format";
import { formatMoney } from "@/lib/loans/labels";
import type { LoanListItem } from "@/lib/loans/types";

export type LoanTableRow = LoanListItem;

export const loanColumns = [
  {
    accessorKey: "customer",
    header: "Customer",
    width: "200px",
    cell: ({ row }: CellContext<LoanTableRow, unknown>) => (
      <div className="flex min-w-0 items-center gap-2">
        <IdentityIcon color="#566873" className="h-4 w-4 shrink-0" />
        <span className="truncate font-medium">
          {row.original.customer
            ? formatIdentityName(row.original.customer)
            : "—"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "principal",
    header: () => <span className="text-right w-full block">Principal</span>,
    width: "140px",
    cell: ({ row }: CellContext<LoanTableRow, unknown>) => (
      <span className="block text-right tabular-nums">
        {formatMoney(row.original.principal)}
      </span>
    ),
  },
  {
    accessorKey: "net_disbursement",
    header: () => <span className="text-right w-full block">Net disbursement</span>,
    width: "160px",
    cell: ({ row }: CellContext<LoanTableRow, unknown>) => (
      <span className="block text-right tabular-nums">
        {formatMoney(row.original.net_disbursement)}
      </span>
    ),
  },
  {
    accessorKey: "term_periods",
    header: "Term",
    width: "80px",
    cell: ({ row }: CellContext<LoanTableRow, unknown>) =>
      `${row.original.term_periods}`,
  },
  {
    accessorKey: "first_payment_date",
    header: "First payment",
    width: "130px",
    cell: ({ row }: CellContext<LoanTableRow, unknown>) =>
      formatDisplayDate(row.original.first_payment_date),
  },
  {
    accessorKey: "status",
    header: "Status",
    width: "140px",
    meta: { disableTruncate: true },
    cell: ({ row }: CellContext<LoanTableRow, unknown>) => (
      <LoanStatusPill status={row.original.status} />
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    width: "180px",
    cell: ({ row }: CellContext<LoanTableRow, unknown>) =>
      formatTableDate(row.original.created_at),
  },
] as unknown as ColumnDef<LoanTableRow>[];
