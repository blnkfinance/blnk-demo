"use client";

import type { CellContext, ColumnDef } from "@tanstack/react-table";
import CurrencyCell from "@/components/blnk-ui/currency-cell";
import FormattedDate from "@/components/blnk-ui/formatted-date";
import SchedulePaymentStatusPill from "@/components/loans/schedule-payment-status";
import { formatDisplayDate } from "@/lib/format";
import { formatMoney } from "@/lib/loans/labels";
import type { LoanRepaymentLine } from "@/lib/loans/types";

const moneyColumnWidth = "140px";

function moneyCell(accessor: keyof LoanRepaymentLine) {
  return ({ row }: CellContext<LoanRepaymentLine, unknown>) => (
    <span className="block text-right tabular-nums">
      {formatMoney(row.original[accessor] as number)}
    </span>
  );
}

function rightAlignedHeader(label: string) {
  return () => <span className="block w-full text-right">{label}</span>;
}

export const repaymentPreviewColumns = [
  {
    id: "currency",
    accessorKey: "currency",
    header: "Currency",
    width: "130px",
    cell: () => <CurrencyCell />,
  },
  {
    accessorKey: "interest",
    header: rightAlignedHeader("Accrued interest"),
    width: moneyColumnWidth,
    cell: moneyCell("interest"),
  },
  {
    accessorKey: "total_amount_paid",
    header: rightAlignedHeader("Amount paid"),
    width: moneyColumnWidth,
    cell: moneyCell("total_amount_paid"),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    width: "140px",
    meta: { disableTruncate: true },
    cell: () => <SchedulePaymentStatusPill status="paid" />,
  },
  {
    accessorKey: "payment_date",
    header: "Payment date",
    width: "120px",
    cell: ({ row }: CellContext<LoanRepaymentLine, unknown>) =>
      formatDisplayDate(row.original.payment_date),
  },
] as unknown as ColumnDef<LoanRepaymentLine>[];

export const repaymentFullColumns = [
  {
    accessorKey: "period",
    header: "Period",
    width: "80px",
    cell: ({ row }: CellContext<LoanRepaymentLine, unknown>) => (
      <span className="tabular-nums">{row.original.period}</span>
    ),
  },
  {
    accessorKey: "payment_date",
    header: "Payment date",
    width: "120px",
    cell: ({ row }: CellContext<LoanRepaymentLine, unknown>) =>
      formatDisplayDate(row.original.payment_date),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    width: "140px",
    meta: { disableTruncate: true },
    cell: () => <SchedulePaymentStatusPill status="paid" />,
  },
  {
    id: "currency",
    accessorKey: "currency",
    header: "Currency",
    width: "130px",
    cell: () => <CurrencyCell />,
  },
  {
    accessorKey: "principal",
    header: rightAlignedHeader("Principal"),
    width: moneyColumnWidth,
    cell: moneyCell("principal"),
  },
  {
    accessorKey: "interest",
    header: rightAlignedHeader("Accrued interest"),
    width: moneyColumnWidth,
    cell: moneyCell("interest"),
  },
  {
    accessorKey: "total_amount_paid",
    header: rightAlignedHeader("Amount paid"),
    width: moneyColumnWidth,
    cell: moneyCell("total_amount_paid"),
  },
  {
    accessorKey: "created_at",
    header: "Repaid at",
    width: "160px",
    cell: ({ row }: CellContext<LoanRepaymentLine, unknown>) => (
      <FormattedDate value={row.original.created_at} showTime />
    ),
  },
] as unknown as ColumnDef<LoanRepaymentLine>[];
