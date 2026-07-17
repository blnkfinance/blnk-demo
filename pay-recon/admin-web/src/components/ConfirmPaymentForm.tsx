"use client";

import { useActionState } from "react";
import { confirmBillPaymentAction } from "@/lib/actions";
import type { ActionState, Bill } from "@/lib/types";
import FormFeedback from "@/components/FormFeedback";
import CopyButton from "@/components/CopyButton";

type Props = {
  bill: Bill;
  prefilledBankTxn?: string;
  integratedDemo?: boolean;
};

export default function ConfirmPaymentForm({
  bill,
  prefilledBankTxn,
  integratedDemo = false,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    (_prev, fd) => confirmBillPaymentAction(bill.id, _prev, fd),
    undefined
  );

  if (bill.status !== "awaiting_payment") {
    if (bill.status === "paid_unreconciled") {
      return (
        <div className="text-xs text-muted">
          <p className="font-medium text-warning">Awaiting reconciliation</p>
          <p className="inline-flex items-center gap-1 font-mono">
            {bill.bank_payment_reference ?? "—"}
            {bill.bank_payment_reference && (
              <CopyButton value={bill.bank_payment_reference} label="Copy bank transaction ID" />
            )}
          </p>
        </div>
      );
    }
    if (bill.status === "paid_reconciled" || bill.status === "paid") {
      return <span className="text-xs font-medium text-success">Reconciled</span>;
    }
    return <span className="text-xs text-muted">—</span>;
  }

  const openByDefault = Boolean(integratedDemo && prefilledBankTxn);

  return (
    <details className="min-w-56" open={openByDefault}>
      <summary className="cursor-pointer rounded-lg bg-brand px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-brand-dark">
        Confirm sent
      </summary>
      <form action={formAction} className="mt-3 flex flex-col gap-2 rounded-xl bg-surface p-3 ring-1 ring-border">
        {integratedDemo && prefilledBankTxn && (
          <p className="rounded-lg bg-info/10 px-2 py-1.5 text-xs text-info">
            Pre-filled from Horizon Bank. In production you would copy the bank transaction
            ID from your bank app or statement.
          </p>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink">Bank transaction ID</span>
          <input
            name="bank_payment_reference"
            required
            defaultValue={prefilledBankTxn ?? ""}
            placeholder="BNK-20260715-A3F9C2D1"
            className="rounded-lg border border-border px-2 py-1.5 font-mono text-xs outline-none focus:border-brand"
          />
          <span className="text-xs text-muted">
            Copy this from your bank after sending payment. PayRecon stores it as attestation —
            the statement upload later verifies it against bank lines.
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink">Payment date</span>
          <input
            name="bank_payment_date"
            type="date"
            defaultValue={today}
            required
            className="rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink">Note</span>
          <input
            name="payment_note"
            placeholder="Optional"
            className="rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:border-brand"
          />
        </label>
        <FormFeedback error={state?.error} success={state?.success} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Confirming…" : "Confirm payment sent"}
        </button>
      </form>
    </details>
  );
}
