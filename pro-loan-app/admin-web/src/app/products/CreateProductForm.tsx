"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createProductAction } from "@/lib/product-actions";

const CURRENCIES = ["NGN", "USD"] as const;

export default function CreateProductForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createProductAction(null, formData);
      if (result && "success" in result) {
        setOpen(false);
        router.refresh();
      } else if (result && "error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
        >
          + New product
        </button>
      ) : (
        <div className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
          <h2 className="mb-4 font-semibold text-ink">Create loan product</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">Product name</span>
              <input
                name="name"
                required
                placeholder="e.g. Personal Loan"
                className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">Currency</span>
              <select
                name="currency"
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              >
                <option value="" disabled>
                  Select currency
                </option>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">
                Min amount ({currency || "currency"})
              </span>
              <input
                name="min_amount"
                type="number"
                required
                min="0"
                step="0.01"
                className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">
                Max amount ({currency || "currency"})
              </span>
              <input
                name="max_amount"
                type="number"
                required
                min="0"
                step="0.01"
                className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">Annual interest rate (%)</span>
              <input
                name="annual_rate"
                type="number"
                required
                min="0"
                step="0.01"
                className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">Origination fee (%)</span>
              <input
                name="origination_fee"
                type="number"
                required
                min="0"
                step="0.01"
                defaultValue="0"
                className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">Term (months)</span>
              <input
                name="term_months"
                type="number"
                required
                min="1"
                className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
            </label>

            {error && (
              <p className="col-span-2 rounded-lg bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-error/30">
                {error}
              </p>
            )}

            <div className="col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50 transition-colors"
              >
                {isPending ? "Creating…" : "Create product"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-border/30 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
