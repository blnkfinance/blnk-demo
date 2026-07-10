"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { prefundFundingPoolAction } from "@/lib/treasury-actions";

const CURRENCIES = ["NGN", "USD"] as const;

const PRESETS: Record<string, { label: string; cents: number }[]> = {
  NGN: [
    { label: "₦1M", cents: 100_000_000 },
    { label: "₦10M", cents: 1_000_000_000 },
    { label: "₦50M", cents: 5_000_000_000 },
  ],
  USD: [
    { label: "$1k", cents: 100_000 },
    { label: "$10k", cents: 1_000_000 },
    { label: "$50k", cents: 5_000_000 },
  ],
};

function formatMoney(currency: string, cents: number) {
  return `${currency} ${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PrefundForm({
  initialCurrency,
  fundingPoolBalanceCents,
}: {
  initialCurrency: string;
  fundingPoolBalanceCents: number;
}) {
  const router = useRouter();
  const [currency, setCurrency] = useState(initialCurrency || "NGN");
  const [amountCents, setAmountCents] = useState("");
  const [description, setDescription] = useState("Treasury prefund from @World");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const presets = PRESETS[currency] ?? PRESETS.NGN;

  async function handlePrefund() {
    const cents = parseInt(amountCents, 10);
    if (!cents || cents <= 0) {
      setError("Enter a valid amount");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    const reference = `prefund-${crypto.randomUUID()}`;

    try {
      const result = await prefundFundingPoolAction({
        currency,
        amountCents: cents,
        description,
        reference,
      });

      if (result && "error" in result) {
        setError(result.error ?? "Prefund failed");
        return;
      }

      if (result && "result" in result) {
        setSuccess(
          `Prefunded ${formatMoney(result.result.currency, result.result.amount_cents)}. Pool balance: ${formatMoney(result.result.currency, result.result.funding_pool_balance_cents)}`
        );
        setAmountCents("");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
      <h2 className="font-semibold text-ink">Prefund funding pool</h2>
      <p className="mt-1 text-sm text-muted">
        Move capital from <span className="font-mono">@World</span> into{" "}
        <span className="font-mono">@FundingPool</span> for loan disbursements.
      </p>

      <div className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm">
        <span className="text-muted">Current pool balance: </span>
        <span className="font-semibold text-ink">
          {formatMoney(currency, fundingPoolBalanceCents)}
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink">Currency</span>
          <select
            value={currency}
            onChange={(e) => {
              const next = e.target.value;
              setCurrency(next);
              setAmountCents("");
              setError("");
              setSuccess("");
              router.push(`/treasury?currency=${next}`);
            }}
            disabled={loading}
            className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="text-sm font-medium text-ink">Quick amounts</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={loading}
                onClick={() => setAmountCents(String(preset.cents))}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink hover:border-brand hover:text-brand disabled:opacity-50 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink">Amount (minor units / cents)</span>
          <input
            type="number"
            value={amountCents}
            onChange={(e) => setAmountCents(e.target.value)}
            min={1}
            disabled={loading}
            placeholder="e.g. 1000000000 for ₦10M"
            className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50"
          />
          {amountCents && parseInt(amountCents, 10) > 0 && (
            <span className="text-xs text-muted">
              = {formatMoney(currency, parseInt(amountCents, 10))}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink">Description</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-error/30">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success ring-1 ring-success/30">
            {success}
          </p>
        )}

        <button
          type="button"
          onClick={handlePrefund}
          disabled={loading || !amountCents}
          className="rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50 transition-colors"
        >
          {loading ? "Prefunding…" : "Prefund from @World"}
        </button>
      </div>
    </div>
  );
}
