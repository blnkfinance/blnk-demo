"use client";

import { useEffect, useState } from "react";
import ModalSheet from "@/components/blnk-ui/modal-sheet";
import SheetPanelRail from "@/components/blnk-ui/sheet-panel-rail";
import ProductStatus from "@/components/blnk-ui/product-status";
import Header from "@/components/blnk-ui/summary-layout/header";
import EditIcon from "@/components/blnk-icons/edit-icon";
import FileIcon from "@/components/blnk-icons/file-icon";
import { Button } from "@/components/ui/button";
import { useFormErrors } from "@/hooks/use-form-errors";
import {
  archiveProduct,
  createProduct,
  getProduct,
  unarchiveProduct,
  updateProduct,
} from "@/lib/products/api";
import { PRODUCT_VALIDATION } from "@/lib/products/validation-messages";
import { showActionError, showLoadError, showSuccessToast } from "@/lib/toast";
import type {
  CreateLoanProductInput,
  LoanProduct,
  SheetMode,
} from "@/lib/products/types";
import { ProductDetailView } from "./product-detail-view";
import {
  emptyProductForm,
  ProductForm,
  ProductFormSubmitButton,
  productToForm,
} from "./product-form";

type ProductSheetProps = {
  token: string;
  mode: SheetMode;
  productId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

type PanelMode = "view" | "create" | "edit";

const EDIT_PRODUCT_FORM_ID = "edit-product-form";

function validateProductForm(form: CreateLoanProductInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.name.trim()) {
    errors.name = PRODUCT_VALIDATION.name;
  }

  if (form.annual_rate_bps < 0 || form.annual_rate_bps > 10000) {
    errors.annual_rate_bps = PRODUCT_VALIDATION.annual_rate_bps;
  }

  if (form.grace_period_type !== "none" && form.grace_period_days == null) {
    errors.grace_period_days = PRODUCT_VALIDATION.grace_period_days;
  }

  return errors;
}

export function ProductSheet({
  token,
  mode,
  productId,
  onClose,
  onSaved,
}: ProductSheetProps) {
  const open = mode !== "closed";
  const [product, setProduct] = useState<LoanProduct | null>(null);
  const [form, setForm] = useState<CreateLoanProductInput>(emptyProductForm());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [internalMode, setInternalMode] = useState<PanelMode>("view");
  const {
    errors,
    setFieldErrorsFromApi,
    clearField,
    clearAll,
    applyApiError,
  } = useFormErrors();

  useEffect(() => {
    if (!open) {
      setProduct(null);
      clearAll();
      return;
    }

    if (mode === "create") {
      setInternalMode("create");
      setForm(emptyProductForm());
      setProduct(null);
      clearAll();
      return;
    }

    if (mode === "view" && productId) {
      setInternalMode("view");
      setLoading(true);
      void getProduct(token, productId).then((result) => {
        setLoading(false);
        if (!result.ok) {
          showLoadError("product", result.message);
          onClose();
          return;
        }
        setProduct(result.product);
        setForm(productToForm(result.product));
      });
    }
  }, [open, mode, productId, token, onClose, clearAll]);

  function handleBack() {
    if (internalMode === "edit" && product) {
      setForm(productToForm(product));
      setInternalMode("view");
      clearAll();
      return;
    }
    onClose();
  }

  function runClientValidation(): boolean {
    clearAll();
    const clientErrors = validateProductForm(form);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrorsFromApi(clientErrors);
      return false;
    }
    return true;
  }

  async function handleCreate() {
    if (!runClientValidation()) return;

    setSubmitting(true);
    const payload = {
      ...form,
      grace_period_days:
        form.grace_period_type === "none" ? null : form.grace_period_days,
    };
    const result = await createProduct(token, payload);
    setSubmitting(false);
    if (!result.ok) {
      const toastMessage = applyApiError(result);
      if (toastMessage) {
        showActionError({ action: "create product", message: toastMessage });
      }
      return;
    }
    showSuccessToast(
      "Loan product created",
      "The new loan product is now available."
    );
    onSaved();
    onClose();
  }

  async function handleUpdate() {
    if (!product) return;
    if (!runClientValidation()) return;

    setSubmitting(true);
    const payload = {
      ...form,
      grace_period_days:
        form.grace_period_type === "none" ? null : form.grace_period_days,
    };
    const result = await updateProduct(token, product.loan_product_id, payload);
    setSubmitting(false);
    if (!result.ok) {
      const toastMessage = applyApiError(result);
      if (toastMessage) {
        showActionError({ action: "save changes", message: toastMessage });
      }
      return;
    }
    setProduct(result.product);
    setForm(productToForm(result.product));
    setInternalMode("view");
    clearAll();
    showSuccessToast(
      "Changes saved",
      "The loan product has been updated successfully."
    );
    onSaved();
  }

  async function handleArchive() {
    if (!product) return;
    setSubmitting(true);
    const result = await archiveProduct(token, product.loan_product_id);
    setSubmitting(false);
    if (!result.ok) {
      showActionError({ action: "archive product", message: result.message });
      return;
    }
    showSuccessToast(
      "Loan product archived",
      "This product is no longer available for new loans."
    );
    onSaved();
    onClose();
  }

  async function handleUnarchive() {
    if (!product) return;
    setSubmitting(true);
    const result = await unarchiveProduct(token, product.loan_product_id);
    setSubmitting(false);
    if (!result.ok) {
      showActionError({ action: "unarchive product", message: result.message });
      return;
    }
    showSuccessToast(
      "Loan product unarchived",
      "This product is active and available for new loans."
    );
    onSaved();
    onClose();
  }

  const sheetTitle =
    internalMode === "create"
      ? "Create new loan product"
      : internalMode === "edit"
        ? "Edit loan product"
        : (product?.name ?? "Product");

  return (
    <ModalSheet
      show={open}
      onClose={onClose}
      onBack={handleBack}
      title={sheetTitle}
    >
      {loading ? (
        <p className="mt-7 text-sm text-platform-muted">Loading…</p>
      ) : internalMode === "create" ? (
        <>
          <div className="mt-2 mb-8">
            <Header title="Create new loan product" />
          </div>
          <section className="mt-7">
            <ProductForm
              value={form}
              onChange={setForm}
              disabled={submitting}
              onSubmit={() => void handleCreate()}
              submitLabel="Create loan product"
              submitting={submitting}
              fieldErrors={errors}
              onFieldChange={clearField}
            />
          </section>
        </>
      ) : product ? (
        <>
          <SheetPanelRail
            showSecondary={internalMode === "edit"}
            primary={
              <>
                <div className="mt-2 mb-8">
                  <Header
                    title={product.name}
                    accessory={<ProductStatus status={product.status} />}
                  />
                </div>
                <section className="mt-7">
                  <ProductDetailView product={product} />
                </section>
              </>
            }
            secondary={
              <>
                <div className="mt-2 mb-8">
                  <Header title="Edit loan product" />
                </div>
                <section className="mt-7">
                  <ProductForm
                    formId={EDIT_PRODUCT_FORM_ID}
                    hideFooter
                    value={form}
                    onChange={setForm}
                    disabled={submitting}
                    onSubmit={() => void handleUpdate()}
                    submitLabel="Save changes"
                    submittingLabel="Saving..."
                    submitting={submitting}
                    fieldErrors={errors}
                    onFieldChange={clearField}
                  />
                </section>
              </>
            }
          />

          {internalMode === "view" && product.status === "archived" ? (
            <div className="sticky bottom-0 z-10 -mx-8 mt-10 flex flex-col space-y-[10px] border-t border-platform-stroke bg-platform-nav-bg px-8 py-4">
              <Button
                type="button"
                variant="secondary"
                className="h-auto w-full px-3 py-2"
                onClick={() => void handleUnarchive()}
                disabled={submitting}
              >
                <FileIcon className="mr-1.5 h-4 w-4" fill="#566873" />
                <span className="text-sm font-medium text-platform-primary-text">
                  Unarchive
                </span>
              </Button>
            </div>
          ) : null}

          {internalMode === "view" && product.status === "active" ? (
            <div className="sticky bottom-0 z-10 -mx-8 mt-10 flex flex-col space-y-[10px] border-t border-platform-stroke bg-platform-nav-bg px-8 py-4">
              <Button
                type="button"
                variant="secondary"
                className="h-auto w-full px-3 py-2"
                onClick={() => setInternalMode("edit")}
                disabled={submitting}
              >
                <EditIcon className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-auto w-full px-3 py-2"
                onClick={() => void handleArchive()}
                disabled={submitting}
              >
                <FileIcon className="mr-1.5 h-4 w-4" fill="#566873" />
                <span className="text-sm font-medium text-platform-primary-text">
                  Archive
                </span>
              </Button>
            </div>
          ) : null}

          {internalMode === "edit" ? (
            <div className="sticky bottom-0 z-10 -mx-8 mt-10 flex flex-col space-y-[10px] border-t border-platform-stroke bg-platform-nav-bg px-8 py-4">
              <ProductFormSubmitButton
                formId={EDIT_PRODUCT_FORM_ID}
                submitting={submitting}
                submitLabel="Save changes"
                submittingLabel="Saving..."
              />
            </div>
          ) : null}
        </>
      ) : null}
    </ModalSheet>
  );
}
