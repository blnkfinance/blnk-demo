"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyAction, quoteLoanAction } from "@/lib/loan-actions";

type Product = {
  id: string;
  name: string;
  currency: string;
  principal_min_cents: number;
  principal_max_cents: number;
  annual_interest_bps: number;
  origination_fee_bps: number;
  term_months: number;
};

type Quote = {
  disbursement: {
    requested_principal_cents: number;
    origination_fee_cents: number;
    total_deductions_cents: number;
    net_disbursement_cents: number;
    currency: string;
  };
  estimated_emi_cents: number;
};

function formatMoney(currency: string, cents: number) {
  return `${currency} ${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function roundStep(currency: string) {
  return currency === "NGN" ? 50_000 : 5_000; // ₦500 or $50
}

function buildPrincipalOptions(
  minCents: number,
  maxCents: number,
  currency: string
): number[] {
  if (minCents <= 0 || maxCents <= 0 || minCents > maxCents) {
    return [];
  }
  if (minCents === maxCents) {
    return [minCents];
  }

  const step = roundStep(currency);
  const slots = 5;
  const options: number[] = [];

  for (let i = 0; i < slots; i++) {
    const ratio = i / (slots - 1);
    const raw = minCents + (maxCents - minCents) * ratio;
    const rounded = Math.round(raw/step) * step;
    const clamped = Math.min(maxCents, Math.max(minCents, rounded));
    options.push(clamped);
  }

  return [...new Set(options)].sort((a, b) => a - b);
}

const BLOCKING_MESSAGES: Record<string, string> = {
  draft:
    "You have a draft loan application. Please cancel it before applying for a new one.",
  submitted:
    "Your loan application is pending approval. Please wait for a decision.",
  approved:
    "Your approved loan is awaiting disbursement. Please wait for it to be disbursed.",
  active:
    "You have an active loan. Please complete repayment before applying for a new one.",
};

export default function ApplyForm({
  products,
  blockingStatus,
}: {
  products: Product[];
  blockingStatus: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Product | null>(null);
  const [principalCents, setPrincipalCents] = useState("");
  const [term, setTerm] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const principalOptions = useMemo(() => {
    if (!selected) return [];
    return buildPrincipalOptions(
      selected.principal_min_cents,
      selected.principal_max_cents,
      selected.currency
    );
  }, [selected]);

  const maxTerm = selected ? selected.term_months : 36;

  useEffect(() => {
    if (!selected || !principalCents || !term) {
      setQuote(null);
      return;
    }

    const cents = parseInt(principalCents, 10);
    if (!cents || cents <= 0) {
      setQuote(null);
      return;
    }

    quoteLoanAction({
      product_id: selected.id,
      principal_cents: cents,
      term_months: parseInt(term, 10),
    }).then((data) => {
      if (data && "error" in data) {
        setQuote(null);
      } else {
        setQuote(data as Quote);
      }
    });
  }, [selected, principalCents, term]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || !principalCents || !term) return;
    setError(null);
    const formData = new FormData();
    formData.set("product_id", selected.id);
    formData.set("principal_cents", principalCents);
    formData.set("term_months", term);
    startTransition(async () => {
      const result = await applyAction(null, formData);
      if (result && "loanId" in result) {
        router.push(`/loans/${result.loanId}`);
      } else if (result && "error" in result) {
        setError(result.error);
      }
    });
  }

  if (blockingStatus) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold text-ink">Apply for a loan</h1>
        <div className="mt-6 rounded-2xl bg-warning/10 p-6 shadow-sm ring-1 ring-warning/30">
          <p className="text-sm text-warning">
            {BLOCKING_MESSAGES[blockingStatus]}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-ink">Apply for a loan</h1>
      <p className="mt-1 text-sm text-muted">
        Choose a product and select the amount you need.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
        <div className="card p-6">
          <h2 className="mb-4 font-semibold text-ink">Select a product</h2>
          {products.length === 0 ? (
            <p className="text-sm text-muted">
              No loan products are available at this time.
            </p>
          ) : (
            <div className="grid gap-3">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelected(p);
                    const options = buildPrincipalOptions(
                      p.principal_min_cents,
                      p.principal_max_cents,
                      p.currency
                    );
                    setPrincipalCents(String(options[0] ?? p.principal_min_cents));
                    setTerm(String(p.term_months));
                  }}
                  className={`flex items-start justify-between rounded-xl border p-4 text-left transition-all ${
                    selected?.id === p.id
                      ? "border-secondary bg-secondary/10 ring-2 ring-secondary/30"
                      : "border-border hover:border-secondary/50"
                  }`}
                >
                  <div>
                    <p className="font-medium text-ink">{p.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {p.currency}{" "}
                      {(p.principal_min_cents / 100).toLocaleString()} –{" "}
                      {(p.principal_max_cents / 100).toLocaleString()} · up to{" "}
                      {p.term_months} months
                    </p>
                  </div>
                  <span className="ml-4 shrink-0 text-sm font-semibold text-secondary">
                    {(p.annual_interest_bps / 100).toFixed(1)}% pa
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="card p-6">
            <h2 className="mb-4 font-semibold text-ink">Loan details</h2>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-ink">
                  Amount ({selected.currency})
                </span>
                <select
                  value={principalCents}
                  onChange={(e) => setPrincipalCents(e.target.value)}
                  required
                  className="input-field"
                >
                  {principalOptions.map((cents) => (
                    <option key={cents} value={String(cents)}>
                      {formatMoney(selected.currency, cents)}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted">
                  Select from available amounts for this product.
                </span>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-ink">
                  Term (months)
                </span>
                <input
                  type="number"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  min={1}
                  max={maxTerm}
                  required
                  className="input-field"
                />
                <span className="text-xs text-muted">Max: {maxTerm} months</span>
              </label>

              {quote && (
                <div className="rounded-xl bg-surface-card p-4 ring-1 ring-border text-sm">
                  <p className="font-medium text-ink mb-3">Disbursement breakdown</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted">Requested</span>
                      <span>
                        {formatMoney(
                          quote.disbursement.currency,
                          quote.disbursement.requested_principal_cents
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Origination fee</span>
                      <span className="text-error">
                        −
                        {formatMoney(
                          quote.disbursement.currency,
                          quote.disbursement.origination_fee_cents
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 font-semibold">
                      <span>You will receive</span>
                      <span className="text-secondary">
                        {formatMoney(
                          quote.disbursement.currency,
                          quote.disbursement.net_disbursement_cents
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted pt-1">
                      <span>Est. monthly payment</span>
                      <span>
                        {formatMoney(
                          quote.disbursement.currency,
                          quote.estimated_emi_cents
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-error/30">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || !selected || !principalCents || !term}
          className="btn-primary"
        >
          {isPending ? "Submitting…" : "Submit application"}
        </button>
      </form>
    </div>
  );
}
