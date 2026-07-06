"use client";

import { DataTable } from "@/components/blnk-ui/data-table";
import EmptyState from "@/components/blnk-ui/empty-state";
import ProductStatus from "@/components/blnk-ui/product-status";
import { formatTableDate } from "@/lib/format";
import { formatRate } from "@/lib/products/labels";
import type { LoanProduct } from "@/lib/products/types";
import { ProductTableSkeleton } from "./product-table-skeleton";
import { productColumns } from "./product-table-columns";

type ProductTableProps = {
  products: LoanProduct[];
  loading?: boolean;
  onRowClick: (product: LoanProduct) => void;
  onAddProduct?: () => void;
};

function ProductsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path
        d="M3.75 5.83333C3.75 4.91286 4.49619 4.16667 5.41667 4.16667H14.5833C15.5038 4.16667 16.25 4.91286 16.25 5.83333V14.1667C16.25 15.0871 15.5038 15.8333 14.5833 15.8333H5.41667C4.49619 15.8333 3.75 15.0871 3.75 14.1667V5.83333Z"
        stroke="#566873"
        strokeWidth="1.25"
      />
      <path
        d="M7.5 8.33333H12.5M7.5 11.6667H10.8333"
        stroke="#566873"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProductTable({
  products,
  loading,
  onRowClick,
  onAddProduct,
}: ProductTableProps) {
  if (loading) {
    return <ProductTableSkeleton />;
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<ProductsIcon />}
        title="No products to show!"
        maxWidth="max-w-[230px]"
        description="Add a loan product or switch tabs to see results."
        actionButton={
          onAddProduct
            ? { text: "Add loan product", onClick: onAddProduct }
            : undefined
        }
      />
    );
  }

  return (
    <DataTable
      columns={productColumns}
      data={products}
      onSelect={onRowClick}
      fixedWidths
      lastColumnFill
      stickyActionsRight={false}
      getRowId={(row) => row.loan_product_id}
      renderMobileCard={(product) => (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-platform-primary-text truncate">
              {product.name}
            </p>
            <p className="text-xs text-platform-muted mt-0.5">
              {formatRate(product.annual_rate_bps, product.interest_type)}
              {" · "}
              {formatTableDate(product.created_at)}
            </p>
          </div>
          <div className="shrink-0">
            <ProductStatus status={product.status} />
          </div>
        </div>
      )}
    />
  );
}
