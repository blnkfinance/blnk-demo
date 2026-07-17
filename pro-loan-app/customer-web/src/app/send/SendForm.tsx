"use client";

import { useActionState, useEffect, useState } from "react";
import {
  getTransferFeesAction,
  resolveRecipientAction,
  sendMoneyAction,
} from "@/lib/wallet-actions";

function formatMoney(currency: string, cents: number) {
  return `${currency} ${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function SendForm({
  balance,
  currency = "NGN",
}: {
  balance: number;
  currency?: string;
}) {
  const [state, formAction, pending] = useActionState(sendMoneyAction, null);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientType, setRecipientType] = useState<"internal" | "external">(
    "internal"
  );
  const [desc, setDesc] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [feeCents, setFeeCents] = useState(5000);
  const [verifying, setVerifying] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resolvedName, setResolvedName] = useState<string | null>(null);

  useEffect(() => {
    getTransferFeesAction(currency, recipientType === "external").then((fees) => {
      setFeeCents(fees.total_charge_cents ?? 5000);
    });
  }, [currency, recipientType]);

  // Transfer errors arrive while still on confirm — jump back so the banner is visible.
  useEffect(() => {
    if (state?.error && confirming) {
      setConfirming(false);
      setLocalError(state.error);
    }
  }, [state?.error, confirming]);

  const amountCents = Math.round(parseFloat(amount || "0") * 100);
  const totalDebitCents = amountCents + feeCents;
  const sufficient = amountCents > 0 ? balance >= totalDebitCents : true;
  const displayCurrency = state?.currency ?? currency;
  const errorMessage = localError ?? state?.error ?? null;

  if (state?.success) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-ink">Transfer Successful</h2>
        <p className="mt-2 text-sm text-muted">
          Your money has been sent
          {recipientType === "internal" ? ` to ${recipient}` : " to @world"}.
        </p>
        <p className="mt-4 text-xs text-muted">
          Available balance:{" "}
          {formatMoney(displayCurrency, state.balance ?? 0)}
        </p>
        <button
          onClick={() => {
            setAmount("");
            setRecipient("");
            setDesc("");
            setConfirming(false);
            setLocalError(null);
            setResolvedName(null);
          }}
          className="mt-6 btn-primary"
        >
          Send Another
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (confirming) {
      const formData = new FormData();
      formData.set("recipient_email", recipient);
      formData.set("recipient_type", recipientType);
      formData.set("currency", currency);
      formData.set("amount", amount);
      formData.set("description", desc);
      formAction(formData);
      return;
    }

    if (recipientType === "internal") {
      setVerifying(true);
      const result = await resolveRecipientAction(recipient);
      setVerifying(false);
      if ("error" in result && result.error) {
        setLocalError(result.error);
        setResolvedName(null);
        return;
      }
      if ("recipient" in result && result.recipient) {
        setRecipient(result.recipient.email);
        setResolvedName(result.recipient.display_name);
      }
    } else {
      setResolvedName(null);
    }

    setConfirming(true);
  }

  const balanceDisplay = formatMoney(currency, balance);
  const amountDisplay = formatMoney(currency, amountCents);
  const feeDisplay = formatMoney(currency, feeCents);
  const totalDisplay = formatMoney(currency, totalDebitCents);
  const busy = pending || verifying;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="card p-5">
        <p className="text-xs text-muted">Your balance ({currency})</p>
        <p className="text-xl font-bold text-ink">{balanceDisplay}</p>
      </div>

      {!confirming ? (
        <>
          <div className="card p-5">
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Transfer type
                </label>
                <select
                  value={recipientType}
                  onChange={(e) => {
                    setRecipientType(e.target.value as "internal" | "external");
                    setLocalError(null);
                    setResolvedName(null);
                  }}
                  className="input-field"
                >
                  <option value="internal">ProBank user</option>
                  <option value="external">External (@world)</option>
                </select>
              </div>

              {recipientType === "internal" && (
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Recipient email
                  </label>
                  <input
                    type="email"
                    value={recipient}
                    onChange={(e) => {
                      setRecipient(e.target.value);
                      setLocalError(null);
                      setResolvedName(null);
                    }}
                    required
                    placeholder="jane@example.com"
                    className="input-field"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted">
                    {currency}
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className="input-field pl-14"
                  />
                </div>
                {amountCents > 0 && !sufficient && (
                  <p className="mt-1 text-xs text-error">
                    Insufficient balance. You need {totalDisplay} but have{" "}
                    {balanceDisplay}.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="What's this for?"
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Fees</span>
              <span className="text-ink font-medium">{feeDisplay}</span>
            </div>
            {amountCents > 0 && (
              <div className="flex justify-between text-sm mt-2 pt-2 border-t border-border/60">
                <span className="text-muted">Total debit</span>
                <span className="text-ink font-bold">{totalDisplay}</span>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-error/10 px-4 py-3 ring-1 ring-error/30">
              <p className="text-sm font-medium text-error">{errorMessage}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={
              busy ||
              !amount ||
              !sufficient ||
              (recipientType === "internal" && !recipient)
            }
            className="btn-primary disabled:cursor-not-allowed"
          >
            {verifying
              ? "Verifying recipient..."
              : pending
                ? "Processing..."
                : "Continue"}
          </button>
        </>
      ) : (
        <>
          <div className="card p-6">
            <h3 className="font-semibold text-ink mb-4">Confirm Transfer</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">To</span>
                <span className="text-ink font-medium text-right">
                  {recipientType === "internal" ? (
                    <>
                      {resolvedName && (
                        <span className="block">{resolvedName}</span>
                      )}
                      <span className={resolvedName ? "text-xs text-muted" : ""}>
                        {recipient}
                      </span>
                    </>
                  ) : (
                    "@world"
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Amount</span>
                <span className="text-ink font-medium">{amountDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Fees</span>
                <span className="text-ink font-medium">{feeDisplay}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border/60">
                <span className="text-muted">Total debit</span>
                <span className="text-ink font-bold">{totalDisplay}</span>
              </div>
              {desc && (
                <div className="flex justify-between">
                  <span className="text-muted">Note</span>
                  <span className="text-ink">{desc}</span>
                </div>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-error/10 px-4 py-3 ring-1 ring-error/30">
              <p className="text-sm font-medium text-error">{errorMessage}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setLocalError(null);
              }}
              className="rounded-xl border border-border bg-surface-card px-6 py-3 text-sm font-semibold text-ink hover:bg-surface-elevated transition-colors flex-1"
            >
              Edit
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 btn-primary"
            >
              {pending ? "Sending..." : "Confirm & Send"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
