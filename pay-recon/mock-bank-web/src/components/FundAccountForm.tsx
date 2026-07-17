"use client";

import { useActionState } from "react";
import { fundAccountAction } from "@/lib/actions";
import { formatNGN, type ActionState, type BankAccount } from "@/lib/api";

const inputClass =
  "rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-bank focus:ring-2 focus:ring-bank/30";

export default function FundAccountForm({ account }: { account: BankAccount }) {
  const [state, formAction, pending] = useActionState<
    (ActionState & { account?: BankAccount }) | undefined,
    FormData
  >(fundAccountAction, undefined);

  const current = state?.account ?? account;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="rounded-2xl bg-surface p-5 ring-1 ring-border">
        <p className="text-sm text-muted">Current balance</p>
        <p className="mt-2 text-3xl font-semibold text-ink">{formatNGN(current.balance)}</p>
        <p className="mt-2 text-xs text-muted">
          {current.account_name} · <span className="font-mono">{current.account_number}</span>
        </p>
      </div>

      <form action={formAction} className="grid gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Amount to fund (NGN)</span>
          <input
            name="amount_naira"
            type="number"
            min="0.01"
            step="0.01"
            required
            className={inputClass}
            placeholder="10000000"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Funding reference (optional)</span>
          <input name="reference" className={inputClass} placeholder="Owner deposit" />
        </label>
        {state?.error && (
          <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{state.error}</p>
        )}
        {state?.success && (
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            {state.success}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-bank px-4 py-2.5 text-sm font-semibold text-white hover:bg-bank-dark disabled:opacity-50"
        >
          {pending ? "Funding…" : "Fund account"}
        </button>
      </form>
    </div>
  );
}
