"use client";

import { useActionState } from "react";
import { createBeneficiaryAction } from "@/lib/actions";
import type { ActionState } from "@/lib/api";

const inputClass =
  "rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-bank focus:ring-2 focus:ring-bank/30";

export default function AddBeneficiaryForm() {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    createBeneficiaryAction,
    undefined
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Beneficiary name</span>
        <input
          name="account_name"
          required
          className={inputClass}
          placeholder="Acme Supplies Ltd"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Account number</span>
        <input
          name="account_number"
          required
          className={inputClass}
          placeholder="0123456789"
        />
      </label>
      <p className="sm:col-span-2 text-xs text-muted">
        Use the same account number you stored for this vendor in PayRecon so reconciliation can
        fall back to beneficiary-account matching when needed.
      </p>
      {state?.error && (
        <p className="sm:col-span-2 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          {state.error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-bank px-4 py-2.5 text-sm font-semibold text-white hover:bg-bank-dark disabled:opacity-50"
        >
          {pending ? "Saving…" : "Add beneficiary"}
        </button>
      </div>
    </form>
  );
}
