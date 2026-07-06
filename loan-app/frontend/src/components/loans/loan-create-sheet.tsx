"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import ModalSheet from "@/components/blnk-ui/modal-sheet";
import Header from "@/components/blnk-ui/summary-layout/header";
import PlusIcon from "@/components/blnk-icons/plus-icon";
import { Button } from "@/components/ui/button";
import { FormRow, Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormErrors } from "@/hooks/use-form-errors";
import { IdentityPicker } from "@/components/loans/identity-picker";
import { createLoan } from "@/lib/loans/api";
import type { CreateLoanInput, SheetMode } from "@/lib/loans/types";
import type { CustomerIdentity } from "@/lib/identities/types";
import { LOAN_VALIDATION } from "@/lib/loans/validation-messages";
import { listProducts } from "@/lib/products/api";
import type { LoanProduct } from "@/lib/products/types";
import { showActionError, showLoadError, showSuccessToast } from "@/lib/toast";
import {
  formatMoneyInputDisplay,
  parseMoneyInputToMinor,
  startOfTodayLocal,
  subtractYearsLocal,
  toIsoDateOnly,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type LoanCreateSheetProps = {
  token: string;
  mode: SheetMode;
  onClose: () => void;
  onCreated: (loanId: string) => void;
};

const CREATE_LOAN_FORM_ID = "create-loan-form";

function defaultFirstPaymentDate(): string {
  const d = startOfTodayLocal();
  d.setMonth(d.getMonth() + 1);
  return toIsoDateOnly(d);
}

export function LoanCreateSheet({
  token,
  mode,
  onClose,
  onCreated,
}: LoanCreateSheetProps) {
  const open = mode === "create";
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    fieldError,
    setFieldError,
    clearField,
    clearAll,
    applyApiError,
  } = useFormErrors();

  const [loanProductId, setLoanProductId] = useState("");
  const [principal, setPrincipal] = useState(formatMoneyInputDisplay("100000"));
  const [originationFee, setOriginationFee] = useState(formatMoneyInputDisplay("2000"));
  const [termPeriods, setTermPeriods] = useState("12");
  const [firstPaymentDate, setFirstPaymentDate] = useState(defaultFirstPaymentDate);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerIdentity | null>(
    null
  );
  const [customerEligible, setCustomerEligible] = useState(false);
  const [customerChecking, setCustomerChecking] = useState(false);

  useEffect(() => {
    if (!open) {
      clearAll();
      setSelectedCustomer(null);
      setCustomerEligible(false);
      setCustomerChecking(false);
      return;
    }
    setLoadingProducts(true);
    void listProducts(token, { status: "active", limit: 100 }).then((result) => {
      setLoadingProducts(false);
      if (!result.ok) {
        showLoadError("products", result.message);
        return;
      }
      setProducts(result.data.products);
      if (result.data.products.length > 0) {
        setLoanProductId(result.data.products[0]!.loan_product_id);
      }
    });
  }, [open, token, clearAll]);

  function validateClient(): boolean {
    const existingCustomerError = fieldError("blnk_identity_id");
    clearAll();
    let valid = true;

    if (!loanProductId) {
      setFieldError("loan_product_id", LOAN_VALIDATION.loan_product_id);
      valid = false;
    }

    const principalMinor = parseMoneyInputToMinor(principal);
    if (principalMinor == null || principalMinor <= 0) {
      setFieldError("principal", LOAN_VALIDATION.principal);
      valid = false;
    }

    const feeMinor = parseMoneyInputToMinor(originationFee);
    if (feeMinor == null) {
      setFieldError("origination_fee", LOAN_VALIDATION.origination_fee);
      valid = false;
    } else if (principalMinor != null && feeMinor >= principalMinor) {
      setFieldError("origination_fee", LOAN_VALIDATION.origination_fee_too_high);
      valid = false;
    }

    const term = Number(termPeriods);
    if (!Number.isInteger(term) || term <= 0) {
      setFieldError("term_periods", LOAN_VALIDATION.term_periods);
      valid = false;
    }

    if (!firstPaymentDate.trim()) {
      setFieldError("first_payment_date", LOAN_VALIDATION.first_payment_date);
      valid = false;
    }

    if (!selectedCustomer) {
      setFieldError("blnk_identity_id", LOAN_VALIDATION.blnk_identity_id_required);
      valid = false;
    } else if (existingCustomerError) {
      setFieldError("blnk_identity_id", existingCustomerError);
      valid = false;
    } else if (!customerEligible) {
      setFieldError("blnk_identity_id", LOAN_VALIDATION.blnk_identity_id_verify);
      valid = false;
    }

    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateClient()) return;

    const principalMinor = parseMoneyInputToMinor(principal)!;
    const feeMinor = parseMoneyInputToMinor(originationFee)!;
    const term = Number(termPeriods);

    const input: CreateLoanInput = {
      loan_product_id: loanProductId,
      principal: principalMinor,
      origination_fee: feeMinor,
      term_periods: term,
      first_payment_date: firstPaymentDate,
      blnk_identity_id: selectedCustomer!.identity_id,
    };

    setSubmitting(true);
    const result = await createLoan(token, input);
    setSubmitting(false);

    if (!result.ok) {
      const toastMessage = applyApiError(result);
      if (toastMessage) {
        showActionError({ action: "create loan", message: toastMessage });
      }
      return;
    }

    showSuccessToast(
      "Loan created",
      "The loan application is ready for review."
    );
    onCreated(result.data.loan.loan_id);
  }

  const selectErrorClass = (key: string) =>
    cn(
      "font-normal",
      fieldError(key) && "border-platform-custom-red"
    );

  return (
    <ModalSheet show={open} onClose={onClose} title="Create loan">
      <div className="mt-2 mb-8">
        <Header title="Create loan" />
      </div>

      <form
        id={CREATE_LOAN_FORM_ID}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <FormRow label="Loan product" error={fieldError("loan_product_id")}>
          <Select
            value={loanProductId}
            onValueChange={(value) => {
              setLoanProductId(value);
              clearField("loan_product_id");
            }}
            disabled={loadingProducts || submitting}
          >
            <SelectTrigger className={selectErrorClass("loan_product_id")}>
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.loan_product_id} value={p.loan_product_id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormRow>

        <FormRow
          label="Customer"
          required
          error={fieldError("blnk_identity_id")}
          success={
            customerEligible ? LOAN_VALIDATION.blnk_identity_id_eligible : undefined
          }
          statusFeedback
        >
          <IdentityPicker
            token={token}
            value={selectedCustomer}
            onChange={(identity) => {
              setSelectedCustomer(identity);
              setCustomerEligible(false);
              if (identity) clearField("blnk_identity_id");
            }}
            onFieldError={(message) => {
              setCustomerEligible(false);
              if (message) {
                setFieldError("blnk_identity_id", message);
              } else {
                clearField("blnk_identity_id");
              }
            }}
            onEligible={() => setCustomerEligible(true)}
            onCheckingChange={setCustomerChecking}
            disabled={submitting}
            error={fieldError("blnk_identity_id")}
          />
        </FormRow>

        <FormRow label="Principal" error={fieldError("principal")}>
          <MoneyInput
            value={principal}
            onChange={(value) => {
              setPrincipal(value);
              clearField("principal");
              clearField("origination_fee");
            }}
            disabled={submitting}
            placeholder="100,000.00"
            error={!!fieldError("principal")}
          />
        </FormRow>

        <FormRow label="Origination fee" error={fieldError("origination_fee")}>
          <MoneyInput
            value={originationFee}
            onChange={(value) => {
              setOriginationFee(value);
              clearField("origination_fee");
            }}
            disabled={submitting}
            placeholder="2,000.00"
            error={!!fieldError("origination_fee")}
          />
        </FormRow>

        <FormRow label="Term periods" error={fieldError("term_periods")}>
          <Input
            type="number"
            min={1}
            value={termPeriods}
            onChange={(e) => {
              setTermPeriods(e.target.value);
              clearField("term_periods");
            }}
            disabled={submitting}
            error={!!fieldError("term_periods")}
          />
        </FormRow>

        <FormRow label="First payment" error={fieldError("first_payment_date")}>
          <DatePicker
            value={firstPaymentDate}
            onChange={(value) => {
              setFirstPaymentDate(value);
              clearField("first_payment_date");
            }}
            disabled={submitting}
            minDate={subtractYearsLocal(startOfTodayLocal(), 1)}
            placeholder="Select date"
            error={!!fieldError("first_payment_date")}
          />
        </FormRow>
      </form>

      <div className="mt-6">
        <Button
          type="submit"
          form={CREATE_LOAN_FORM_ID}
          disabled={
            submitting ||
            loadingProducts ||
            !selectedCustomer ||
            customerChecking ||
            !customerEligible
          }
          className="inline-flex h-auto w-full items-center justify-center rounded-md bg-platform-button-main-bg px-3 py-2 text-platform-primary-text hover:bg-platform-button-main-bg/90"
        >
          {submitting ? (
            <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
          )}
          {submitting ? "Creating…" : "Create loan"}
        </Button>
      </div>
    </ModalSheet>
  );
}
