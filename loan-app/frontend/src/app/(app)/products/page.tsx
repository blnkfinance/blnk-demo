"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductListToolbar } from "@/components/products/product-list-toolbar";
import { ProductSheet } from "@/components/products/product-sheet";
import { ProductTable } from "@/components/products/product-table";
import SectionHeader from "@/components/blnk-ui/section-header";
import { listProducts } from "@/lib/products/api";
import { showLoadError } from "@/lib/toast";
import type { LoanProduct, ProductStatus, SheetMode } from "@/lib/products/types";

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<ProductStatus>("active");
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<ProductStatus, number>>({
    active: 0,
    archived: 0,
  });
  const [loading, setLoading] = useState(true);

  const [sheetMode, setSheetMode] = useState<SheetMode>("closed");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const result = await listProducts(token, { status });
    setLoading(false);
    if (!result.ok) {
      showLoadError("products", result.message);
      setProducts([]);
      return;
    }
    setProducts(result.data.products);
    setTabCounts((prev) => ({ ...prev, [status]: result.data.total }));
  }, [token, status]);

  const loadTabCounts = useCallback(async () => {
    if (!token) return;
    const [activeResult, archivedResult] = await Promise.all([
      listProducts(token, { status: "active", limit: 1 }),
      listProducts(token, { status: "archived", limit: 1 }),
    ]);
    setTabCounts({
      active: activeResult.ok ? activeResult.data.total : 0,
      archived: archivedResult.ok ? archivedResult.data.total : 0,
    });
  }, [token]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    void loadTabCounts();
  }, [loadTabCounts]);

  function handleStatusChange(next: ProductStatus) {
    if (next === status) return;
    setStatus(next);
    setProducts([]);
    setLoading(true);
  }

  function openCreate() {
    setSelectedProductId(null);
    setSheetMode("create");
  }

  function openView(product: LoanProduct) {
    setSelectedProductId(product.loan_product_id);
    setSheetMode("view");
  }

  function closeSheet() {
    setSheetMode("closed");
    setSelectedProductId(null);
  }

  if (!token) {
    return null;
  }

  return (
    <>
      <div className="hidden">
        <SectionHeader
          title="Products"
          subtitle="Define and maintain loan products used when creating loans."
        />
      </div>

      <div className="space-y-4">
        <ProductListToolbar
          status={status}
          onStatusChange={handleStatusChange}
          onAddProduct={openCreate}
          counts={tabCounts}
        />

        <ProductTable
          products={products}
          loading={loading}
          onRowClick={openView}
          onAddProduct={openCreate}
        />
      </div>

      <ProductSheet
        token={token}
        mode={sheetMode}
        productId={selectedProductId}
        onClose={closeSheet}
        onSaved={() => {
          void loadProducts();
          void loadTabCounts();
        }}
      />
    </>
  );
}
