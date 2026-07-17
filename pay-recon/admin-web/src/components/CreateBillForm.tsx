"use client";

import { useActionState } from "react";
import { createBillAction } from "@/lib/actions";
import type { ActionState, Bill, Merchant, PaymentInstruction, WHTCategory } from "@/lib/types";
import { formatNGN } from "@/lib/money";
import { getHorizonUrl, koboToNairaParam } from "@/lib/urls";
import FormFeedback from "@/components/FormFeedback";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/Field";
import { CopyableValue } from "@/components/CopyButton";

export default function CreateBillForm({
  merchants,
  categories,
}: {
  merchants: Merchant[];
  categories: WHTCategory[];
}) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    createBillAction,
    undefined
  );

  const bill = state?.data?.bill as Bill | undefined;
  const instruction = state?.data?.payment_instruction as PaymentInstruction | undefined;
  const netNaira =
    instruction != null ? (instruction.amount / 100).toFixed(2) : "";

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Vendor invoice # (optional)"
          name="vendor_invoice_ref"
          placeholder="INV-2026-0042"
        />
        <SelectField label="Merchant" name="merchant_id" required defaultValue="">
          <option value="" disabled>
            Select merchant
          </option>
          {merchants.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="WHT category" name="wht_category_id" required defaultValue="">
          <option value="" disabled>
            Select category
          </option>
          {categories.map((c) => {
            const rate =
              typeof c.rate === "number" ? c.rate : Number.parseFloat(String(c.rate));
            return (
              <option key={c.id} value={c.id}>
                {c.label} ({(rate * 100).toFixed(0)}%)
              </option>
            );
          })}
        </SelectField>
        <TextField
          label="Gross amount (NGN)"
          name="gross_amount_naira"
          required
          type="number"
          min="1"
          step="0.01"
          placeholder="2000000"
        />
        <div className="sm:col-span-2">
          <TextAreaField
            label="Purpose"
            name="purpose"
            required
            placeholder="Office supplies Q1"
          />
        </div>
        <p className="sm:col-span-2 text-xs text-muted">
          Payment reference is generated automatically. You may include it in the bank narration
          (optional — some banks flag long references). After payment, copy the bank&apos;s
          transaction ID back here to confirm.
        </p>
        <div className="sm:col-span-2 flex flex-col gap-3">
          <FormFeedback error={state?.error} success={state?.success} />
          <SubmitButton pending={pending} label="Create bill" pendingLabel="Creating…" />
        </div>
      </form>

      {bill && instruction && (
        <div className="overflow-hidden rounded-2xl ring-2 ring-brand shadow-sm">
          <div className="bg-brand px-5 py-4 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-white/80">
              Payment instruction — pay exactly this amount
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight">
              {formatNGN(instruction.amount)}
            </p>
            <p className="mt-1 text-sm font-medium text-white/90">
              Net to vendor · do not pay gross. WHT stays with the company until remittance.
            </p>
          </div>
          <div className="bg-surface-elevated p-5">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <CopyableValue
                label="Pay exactly (net)"
                value={formatNGN(instruction.amount)}
                copyValue={netNaira}
                emphasize
              />
              <CopyableValue
                label="Beneficiary account"
                value={instruction.account_number}
                mono
              />
              <CopyableValue
                label="Bank name"
                value={instruction.bank_name}
              />
              <CopyableValue
                label="Payment reference / narration"
                value={bill.bill_reference}
                mono
              />
              {bill.vendor_invoice_ref && (
                <CopyableValue label="Vendor invoice" value={bill.vendor_invoice_ref} />
              )}
              <div>
                <dt className="text-muted">Gross / WHT / Net</dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {formatNGN(bill.gross_amount)} → WHT {formatNGN(bill.wht_amount)} →{" "}
                  {formatNGN(bill.net_amount)}
                </dd>
              </div>
            </dl>
            <a
              href={`${getHorizonUrl()}/transfers?billId=${encodeURIComponent(bill.id)}&amount=${koboToNairaParam(instruction.amount)}&beneficiaryAccount=${encodeURIComponent(instruction.account_number)}&narration=${encodeURIComponent(bill.bill_reference)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Open Horizon Bank to pay →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
