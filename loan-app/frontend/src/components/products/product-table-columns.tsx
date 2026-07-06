"use client";

import type { CellContext, ColumnDef } from "@tanstack/react-table";
import ProductStatus from "@/components/blnk-ui/product-status";
import { formatTableDate } from "@/lib/format";
import { formatRate } from "@/lib/products/labels";
import type { LoanProduct } from "@/lib/products/types";

export const productColumns = [
  {
    accessorKey: "name",
    header: "Product",
    width: "240px",
    cell: ({ row }: CellContext<LoanProduct, unknown>) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "annual_rate_bps",
    header: () => <span>Rate</span>,
    width: "160px",
    cell: ({ row }: CellContext<LoanProduct, unknown>) =>
      formatRate(row.original.annual_rate_bps, row.original.interest_type),
  },
  {
    accessorKey: "created_at",
    header: () => <span>Created at</span>,
    width: "200px",
    cell: ({ row }: CellContext<LoanProduct, unknown>) =>
      formatTableDate(row.original.created_at),
  },
  {
    accessorKey: "status",
    header: () => <span>Status</span>,
    width: "140px",
    meta: { disableTruncate: true },
    cell: ({ row }: CellContext<LoanProduct, unknown>) => (
      <ProductStatus status={row.original.status} />
    ),
  },
] as unknown as ColumnDef<LoanProduct>[];
