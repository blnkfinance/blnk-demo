"use client";

import { useActionState } from "react";
import { confirmRemittanceAction, createRemittanceAction } from "@/lib/actions";
import { formatNGN } from "@/lib/money";
import type { ActionState, Remittance } from "@/lib/types";
import FormFeedback from "@/components/FormFeedback";
import { SubmitButton, TextField } from "@/components/Field";
import CopyButton, { CopyableValue } from "@/components/CopyButton";
import { getHorizonUrl, koboToNairaParam } from "@/lib/urls";

export function CreateRemittanceForm() {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    createRemittanceAction,
    undefined
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <TextField
        label="Period (YYYY-MM)"
        name="period"
        required
        pattern="\d{4}-\d{2}"
        placeholder="2026-07"
      />
      <FormFeedback error={state?.error} success={state?.success} />
      <SubmitButton pending={pending} label="Create remittance" pendingLabel="Creating…" />
    </form>
  );
}

export function ConfirmRemittanceButton({ remittance }: { remittance: Remittance }) {
  const today = new Date().toISOString().slice(0, 10);
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    (_prev, fd) => confirmRemittanceAction(remittance.id, fd),
    undefined
  );
  const amountNaira = (remittance.total_amount / 100).toFixed(2);

  if (remittance.status === "remitted" || remittance.status === "confirmed" || remittance.remitted_at) {
    return <span className="text-sm text-success">Remitted</span>;
  }

  if (remittance.status === "paid_unreconciled") {
    return (
      <div className="text-right text-xs text-muted">
        <p className="font-medium text-warning">Awaiting reconciliation</p>
        <p className="inline-flex items-center gap-1 font-mono">
          {remittance.bank_payment_reference ?? "—"}
          {remittance.bank_payment_reference && (
            <CopyButton value={remittance.bank_payment_reference} label="Copy bank transaction ID" />
          )}
        </p>
      </div>
    );
  }

  return (
    <details className="min-w-64">
      <summary className="cursor-pointer rounded-lg bg-brand px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-brand-dark">
        Confirm paid
      </summary>
      <div className="mt-3 overflow-hidden rounded-xl ring-2 ring-brand">
        <div className="bg-brand px-3 py-2.5 text-left text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
            Pay FIRS exactly this amount
          </p>
          <p className="mt-1 text-xl font-bold">{formatNGN(remittance.total_amount)}</p>
        </div>
        <div className="bg-surface p-3 text-left text-xs">
          <dl className="grid gap-3">
            <CopyableValue
              label="Amount"
              value={formatNGN(remittance.total_amount)}
              copyValue={amountNaira}
              emphasize
            />
            <CopyableValue label="FIRS account" value="FIRS-WHT-001" mono />
            <CopyableValue
              label="Narration"
              value={`WHT ${remittance.period}`}
              mono
            />
          </dl>
          <a
            href={`${getHorizonUrl()}/transfers?amount=${koboToNairaParam(remittance.total_amount)}&beneficiaryAccount=FIRS-WHT-001&narration=${encodeURIComponent(`WHT ${remittance.period}`)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex text-xs font-semibold text-brand hover:underline"
          >
            Open Horizon Bank to pay →
          </a>
        </div>
      </div>
      <form action={formAction} className="mt-2 flex flex-col gap-2 rounded-xl bg-surface p-3 ring-1 ring-border">
        <label className="flex flex-col gap-1 text-left">
          <span className="text-xs font-medium text-ink">Bank transaction ID</span>
          <input
            name="bank_payment_reference"
            required
            placeholder="BNK-20260716-A3F9C2D1"
            className="rounded-lg border border-border px-2 py-1.5 font-mono text-xs outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-left">
          <span className="text-xs font-medium text-ink">Payment date</span>
          <input
            name="bank_payment_date"
            type="date"
            required
            defaultValue={today}
            className="rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-left">
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
          {pending ? "Confirming…" : "Confirm remittance sent"}
        </button>
      </form>
    </details>
  );
}
