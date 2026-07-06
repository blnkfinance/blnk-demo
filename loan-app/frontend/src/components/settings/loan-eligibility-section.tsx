"use client";

import { useEffect, useState } from "react";
import {
  fetchLoanEligibilitySettings,
  patchLoanEligibilitySettings,
} from "@/lib/settings/api";
import {
  LOAN_BOOK_OPTIONS,
  type LoanBookType,
  type LoanEligibilitySettings,
} from "@/lib/settings/types";
import { showActionError } from "@/lib/toast";
import { cn } from "@/lib/utils";

type LoanEligibilitySectionProps = {
  token: string;
};

function BookTypeToggle({
  label,
  checked,
  disabled,
  saving,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  saving: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex flex-row items-center gap-x-4">
      <div className="flex w-[280px] shrink-0 items-center pl-2">
        <span className="text-sm font-medium text-platform-primary-text">
          {label}
        </span>
      </div>
      <div className="min-w-0 flex-1 pl-4">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={`${label} ${checked ? "enabled" : "disabled"}`}
          disabled={disabled || saving}
          onClick={() => onChange(!checked)}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-in-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-platform-button-main-bg focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            checked ? "bg-platform-button-main-bg" : "bg-platform-stroke"
          )}
        >
          <span
            className={cn(
              "pointer-events-none absolute top-0.5 block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
              checked ? "translate-x-[18px]" : "translate-x-0.5"
            )}
          />
        </button>
      </div>
    </div>
  );
}

export function LoanEligibilitySection({ token }: LoanEligibilitySectionProps) {
  const [allowedBooks, setAllowedBooks] = useState<LoanBookType[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBook, setSavingBook] = useState<LoanBookType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchLoanEligibilitySettings(token).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setAllowedBooks(result.settings.allowed_books);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleToggle(book: LoanBookType, enabled: boolean) {
    const isCurrentlyEnabled = allowedBooks.includes(book);
    if (enabled === isCurrentlyEnabled) return;

    if (!enabled && allowedBooks.length <= 1) {
      return;
    }

    const nextBooks = LOAN_BOOK_OPTIONS.map((option) => option.value).filter(
      (value) =>
        value === book ? enabled : allowedBooks.includes(value)
    );

    const previousBooks = allowedBooks;
    setAllowedBooks(nextBooks);
    setSavingBook(book);
    setError(null);

    const payload: LoanEligibilitySettings = { allowed_books: nextBooks };
    const result = await patchLoanEligibilitySettings(token, payload);
    setSavingBook(null);

    if (!result.ok) {
      setAllowedBooks(previousBooks);
      setError(result.message);
      showActionError({
        action: "update loan eligibility settings",
        message: result.message,
      });
      return;
    }

    setAllowedBooks(result.settings.allowed_books);
  }

  return (
    <section id="loan-eligibility" className="scroll-mt-6 space-y-4">
      <div className="space-y-2">
        <h2 className="font-pastiche text-lg font-semibold leading-[125%] tracking-[-0.18px] text-platform-primary-text">
          Loan eligibility
        </h2>
        <p className="text-sm leading-[150%] text-platform-muted">
          Choose which balance book types qualify customers for new loans.
          At least one book type must stay enabled.
        </p>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-platform-muted">
          Loading eligibility settings…
        </div>
      ) : error && allowedBooks.length === 0 ? (
        <p className="text-sm text-platform-muted">{error}</p>
      ) : (
        <div className="w-full">
          <div className="flex flex-row items-center gap-x-4 border-b border-platform-stroke pb-2">
            <span className="w-[280px] shrink-0 py-2 pl-2 text-[10px] font-pastiche font-medium uppercase leading-3 tracking-[0.5px] text-platform-primary-text">
              Book type
            </span>
            <span className="flex-1 py-2 pl-4" aria-hidden />
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {LOAN_BOOK_OPTIONS.map((option) => {
              const checked = allowedBooks.includes(option.value);
              const isLastEnabled = checked && allowedBooks.length === 1;

              return (
                <BookTypeToggle
                  key={option.value}
                  label={option.label}
                  checked={checked}
                  disabled={isLastEnabled}
                  saving={savingBook === option.value}
                  onChange={(next) => void handleToggle(option.value, next)}
                />
              );
            })}
          </div>
        </div>
      )}

      {error && allowedBooks.length > 0 ? (
        <p className="text-sm text-platform-muted">{error}</p>
      ) : null}
    </section>
  );
}
