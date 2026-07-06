"use client";

import type { CellContext, ColumnDef } from "@tanstack/react-table";
import CurrencyCell from "@/components/blnk-ui/currency-cell";
import SchedulePaymentStatusPill from "@/components/loans/schedule-payment-status";
import { formatDisplayDate } from "@/lib/format";
import { formatMoney } from "@/lib/loans/labels";
import type { ScheduleLine } from "@/lib/loans/types";

const moneyColumnWidth = "140px";

function moneyCell(accessor: keyof ScheduleLine) {
  return ({ row }: CellContext<ScheduleLine, unknown>) => (
    <span className="block text-right tabular-nums">
      {formatMoney(row.original[accessor] as number)}
    </span>
  );
}

function rightAlignedHeader(label: string) {
  return () => <span className="block w-full text-right">{label}</span>;
}

export const schedulePreviewColumns = [
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
    accessorKey: "expected_payment",
    header: rightAlignedHeader("Expected payment"),
    width: moneyColumnWidth,
    cell: moneyCell("expected_payment"),
  },
  {
    accessorKey: "status",
    header: "Status",
    width: "140px",
    meta: { disableTruncate: true },
    cell: ({ row }: CellContext<ScheduleLine, unknown>) => (
      <SchedulePaymentStatusPill status={row.original.status} />
    ),
  },
  {
    accessorKey: "payment_date",
    header: "Payment date",
    width: "120px",
    cell: ({ row }: CellContext<ScheduleLine, unknown>) =>
      formatDisplayDate(row.original.payment_date),
  },
] as unknown as ColumnDef<ScheduleLine>[];

export const scheduleFullColumns = [
  {
    accessorKey: "period",
    header: "Period",
    width: "80px",
    cell: ({ row }: CellContext<ScheduleLine, unknown>) => (
      <span className="tabular-nums">{row.original.period}</span>
    ),
  },
  {
    accessorKey: "payment_date",
    header: "Payment date",
    width: "120px",
    cell: ({ row }: CellContext<ScheduleLine, unknown>) =>
      formatDisplayDate(row.original.payment_date),
  },
  {
    accessorKey: "status",
    header: "Status",
    width: "140px",
    meta: { disableTruncate: true },
    cell: ({ row }: CellContext<ScheduleLine, unknown>) => (
      <SchedulePaymentStatusPill status={row.original.status} />
    ),
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
    accessorKey: "expected_payment",
    header: rightAlignedHeader("Expected payment"),
    width: moneyColumnWidth,
    cell: moneyCell("expected_payment"),
  },
  {
    accessorKey: "closing_principal",
    header: rightAlignedHeader("Closing principal"),
    width: moneyColumnWidth,
    cell: moneyCell("closing_principal"),
  },
  {
    accessorKey: "carrying_amount",
    header: rightAlignedHeader("Carrying amount"),
    width: moneyColumnWidth,
    cell: moneyCell("carrying_amount"),
  },
  {
    accessorKey: "eir_interest",
    header: rightAlignedHeader("EIR interest"),
    width: moneyColumnWidth,
    cell: moneyCell("eir_interest"),
  },
  {
    accessorKey: "fee_income",
    header: rightAlignedHeader("Fee income"),
    width: moneyColumnWidth,
    cell: moneyCell("fee_income"),
  },
] as unknown as ColumnDef<ScheduleLine>[];
