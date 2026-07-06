"use client";

import { LoaderCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import PlusIcon from "@/components/blnk-icons/plus-icon";
import StackIcon from "@/components/blnk-icons/stack-icon";
import { Button } from "@/components/ui/button";
import { FormRow, Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AMORTIZATION_LABELS,
  DAY_COUNT_LABELS,
  GRACE_PERIOD_LABELS,
  PAYMENT_FREQUENCY_LABELS,
} from "@/lib/products/labels";
import type {
  AmortizationType,
  CreateLoanProductInput,
  DayCountConvention,
  GracePeriodType,
  LoanProduct,
  PaymentFrequency,
} from "@/lib/products/types";

export const emptyProductForm = (): CreateLoanProductInput => ({
  name: "",
  interest_type: "fixed",
  annual_rate_bps: 2400,
  day_count_convention: "actual_360",
  payment_frequency: "monthly",
  amortization_type: "equal_installments",
  grace_period_type: "none",
  grace_period_days: null,
});

export function productToForm(product: LoanProduct): CreateLoanProductInput {
  return {
    name: product.name,
    interest_type: product.interest_type,
    annual_rate_bps: product.annual_rate_bps,
    day_count_convention: product.day_count_convention,
    payment_frequency: product.payment_frequency,
    amortization_type: product.amortization_type,
    grace_period_type: product.grace_period_type,
    grace_period_days: product.grace_period_days,
  };
}

type ProductFormProps = {
  value: CreateLoanProductInput;
  onChange: (value: CreateLoanProductInput) => void;
  disabled?: boolean;
  onSubmit?: () => void;
  submitLabel?: string;
  submittingLabel?: string;
  submitting?: boolean;
  submitDisabled?: boolean;
  formId?: string;
  hideFooter?: boolean;
  fieldErrors?: Record<string, string | undefined>;
  onFieldChange?: (field: string) => void;
};

const selectTriggerClassName =
  "font-normal leading-none [&[data-placeholder]]:leading-none [&[data-placeholder]]:text-platform-muted";

function bpsToRateDisplay(bps: number): string {
  if (bps === 0) return "";
  const pct = bps / 100;
  return Number.isInteger(pct) ? String(pct) : String(pct);
}

function isPartialRateInput(text: string): boolean {
  return text === "" || /^\d*\.?\d*$/.test(text);
}

type AnnualRateInputProps = {
  id: string;
  valueBps: number;
  disabled?: boolean;
  error?: boolean;
  onChangeBps: (bps: number) => void;
  onFieldChange?: () => void;
};

function AnnualRateInput({
  id,
  valueBps,
  disabled,
  error,
  onChangeBps,
  onFieldChange,
}: AnnualRateInputProps) {
  const [text, setText] = useState(() => bpsToRateDisplay(valueBps));
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setText(bpsToRateDisplay(valueBps));
    }
  }, [valueBps]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    if (!isPartialRateInput(next)) return;

    setText(next);
    onFieldChange?.();

    if (next === "" || next === ".") {
      onChangeBps(0);
      return;
    }

    const parsed = parseFloat(next);
    if (!Number.isNaN(parsed)) {
      onChangeBps(Math.round(parsed * 100));
    }
  }

  function handleBlur() {
    isFocusedRef.current = false;

    if (text === "" || text === ".") {
      setText("");
      onChangeBps(0);
      return;
    }

    const parsed = parseFloat(text);
    if (Number.isNaN(parsed)) {
      setText(bpsToRateDisplay(valueBps));
      return;
    }

    const bps = Math.round(parsed * 100);
    onChangeBps(bps);
    setText(bpsToRateDisplay(bps));
  }

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={text}
      placeholder="24"
      onChange={handleChange}
      onFocus={() => {
        isFocusedRef.current = true;
      }}
      onBlur={handleBlur}
      error={error}
    />
  );
}

type ProductFormSubmitButtonProps = {
  formId?: string;
  submitting?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  submitDisabled?: boolean;
};

export function ProductFormSubmitButton({
  formId,
  submitting = false,
  submitLabel = "Create loan product",
  submittingLabel = "Creating...",
  submitDisabled = false,
}: ProductFormSubmitButtonProps) {
  const isSave =
    submittingLabel === "Saving..." || submitLabel === "Save changes";

  return (
    <Button
      type="submit"
      form={formId}
      disabled={submitting || submitDisabled}
      className="inline-flex h-auto w-full items-center justify-center rounded-md bg-platform-button-main-bg px-3 py-2 text-platform-primary-text hover:bg-platform-button-main-bg/90"
    >
      {submitting ? (
        <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
      ) : isSave ? (
        <StackIcon
          className="mr-1.5 h-3.5 w-3.5"
          fill="var(--platform-primary-text)"
        />
      ) : (
        <PlusIcon className="mr-1.5" />
      )}
      <span className="text-sm font-medium">
        {submitting ? submittingLabel : submitLabel}
      </span>
    </Button>
  );
}

export function ProductForm({
  value,
  onChange,
  disabled,
  onSubmit,
  submitLabel = "Create loan product",
  submittingLabel = "Creating...",
  submitting = false,
  submitDisabled = false,
  formId,
  hideFooter = false,
  fieldErrors = {},
  onFieldChange,
}: ProductFormProps) {
  function patch(partial: Partial<CreateLoanProductInput>) {
    onChange({ ...value, ...partial });
    for (const key of Object.keys(partial)) {
      onFieldChange?.(key);
    }
  }

  function fieldError(key: string) {
    return fieldErrors[key];
  }

  const showGraceDays = value.grace_period_type !== "none";

  const fields = (
    <div className="w-full gap-3 flex flex-col items-stretch">
      <FormRow label="Product name" htmlFor="product-name" error={fieldError("name")}>
        <Input
          id="product-name"
          value={value.name}
          disabled={disabled}
          placeholder="Personal Loan"
          onChange={(e) => patch({ name: e.target.value })}
          error={!!fieldError("name")}
        />
      </FormRow>

      <FormRow label="Interest type" htmlFor="interest-type">
        <Select
          value={value.interest_type}
          onValueChange={(interest_type) =>
            patch({ interest_type: interest_type as "fixed" })
          }
          disabled={disabled}
        >
          <SelectTrigger id="interest-type" className={selectTriggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed</SelectItem>
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow label="Annual rate %" htmlFor="annual-rate" error={fieldError("annual_rate_bps")}>
        <AnnualRateInput
          id="annual-rate"
          valueBps={value.annual_rate_bps}
          disabled={disabled}
          error={!!fieldError("annual_rate_bps")}
          onChangeBps={(annual_rate_bps) => patch({ annual_rate_bps })}
          onFieldChange={() => onFieldChange?.("annual_rate_bps")}
        />
      </FormRow>

      <FormRow label="Day count" htmlFor="day-count">
        <Select
          value={value.day_count_convention}
          onValueChange={(day_count_convention) =>
            patch({
              day_count_convention: day_count_convention as DayCountConvention,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger id="day-count" className={selectTriggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(DAY_COUNT_LABELS) as [DayCountConvention, string][]).map(
              ([optionValue, label]) => (
                <SelectItem key={optionValue} value={optionValue}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow label="Frequency" htmlFor="payment-frequency">
        <Select
          value={value.payment_frequency}
          onValueChange={(payment_frequency) =>
            patch({
              payment_frequency: payment_frequency as PaymentFrequency,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger id="payment-frequency" className={selectTriggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(
              Object.entries(PAYMENT_FREQUENCY_LABELS) as [PaymentFrequency, string][]
            ).map(([optionValue, label]) => (
              <SelectItem key={optionValue} value={optionValue}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow label="Amortization" htmlFor="amortization-type">
        <Select
          value={value.amortization_type}
          onValueChange={(amortization_type) =>
            patch({
              amortization_type: amortization_type as AmortizationType,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger id="amortization-type" className={selectTriggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(
              Object.entries(AMORTIZATION_LABELS) as [AmortizationType, string][]
            ).map(([optionValue, label]) => (
              <SelectItem key={optionValue} value={optionValue}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow label="Grace period" htmlFor="grace-period">
        <Select
          value={value.grace_period_type}
          onValueChange={(grace_period_type) => {
            const typed = grace_period_type as GracePeriodType;
            patch({
              grace_period_type: typed,
              grace_period_days:
                typed === "none" ? null : value.grace_period_days,
            });
          }}
          disabled={disabled}
        >
          <SelectTrigger id="grace-period" className={selectTriggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(
              Object.entries(GRACE_PERIOD_LABELS) as [GracePeriodType, string][]
            ).map(([optionValue, label]) => (
              <SelectItem key={optionValue} value={optionValue}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      <AnimatePresence initial={false}>
        {showGraceDays ? (
          <motion.div
            key="grace-days"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <FormRow label="Grace days" htmlFor="grace-days" error={fieldError("grace_period_days")}>
              <Input
                id="grace-days"
                type="number"
                min={1}
                disabled={disabled}
                value={value.grace_period_days ?? ""}
                placeholder="30"
                onChange={(e) =>
                  patch({
                    grace_period_days: e.target.value
                      ? parseInt(e.target.value, 10)
                      : null,
                  })
                }
                error={!!fieldError("grace_period_days")}
              />
            </FormRow>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );

  if (!onSubmit) {
    return fields;
  }

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="w-full"
    >
      {fields}
      {hideFooter ? null : (
        <div className="-mx-8 mt-6 flex flex-col space-y-[10px] border-t border-platform-stroke px-8 py-4">
          <ProductFormSubmitButton
            submitting={submitting}
            submitLabel={submitLabel}
            submittingLabel={submittingLabel}
            submitDisabled={submitDisabled}
          />
        </div>
      )}
    </form>
  );
}
