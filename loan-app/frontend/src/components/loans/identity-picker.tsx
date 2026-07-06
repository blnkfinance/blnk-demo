"use client";

import { LoaderCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import IdentityIcon from "@/components/blnk-icons/identity-icon";
import { Input } from "@/components/ui/input";
import { checkIdentityLoanEligibility, searchIdentities } from "@/lib/identities/api";
import { formatIdentityName } from "@/lib/identities/format";
import type { CustomerIdentity } from "@/lib/identities/types";
import { LOAN_VALIDATION } from "@/lib/loans/validation-messages";
import { cn } from "@/lib/utils";

type IdentityPickerProps = {
  token: string;
  value: CustomerIdentity | null;
  onChange: (identity: CustomerIdentity | null) => void;
  onFieldError: (message: string | null) => void;
  onEligible?: () => void;
  onCheckingChange?: (checking: boolean) => void;
  disabled?: boolean;
  error?: string;
};

export function IdentityPicker({
  token,
  value,
  onChange,
  onFieldError,
  onEligible,
  onCheckingChange,
  disabled = false,
  error,
}: IdentityPickerProps) {
  const [query, setQuery] = useState(value ? formatIdentityName(value) : "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchPending, setSearchPending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [suggestions, setSuggestions] = useState<CustomerIdentity[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eligibilityRequestRef = useRef(0);

  useEffect(() => {
    setQuery(value ? formatIdentityName(value) : "");
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    onCheckingChange?.(checking || searchPending);
  }, [checking, searchPending, onCheckingChange]);

  async function runEligibilityCheck(identity: CustomerIdentity): Promise<void> {
    const requestId = ++eligibilityRequestRef.current;
    setChecking(true);
    onFieldError(null);

    const result = await checkIdentityLoanEligibility(token, identity.identity_id);
    if (requestId !== eligibilityRequestRef.current) return;

    setChecking(false);
    if (!result.ok) {
      onFieldError(result.message);
      return;
    }

    if (!result.data.eligible) {
      onFieldError(
        result.data.message ?? LOAN_VALIDATION.blnk_identity_id_ineligible
      );
      return;
    }

    onFieldError(null);
    onEligible?.();
  }

  async function fetchSuggestions(searchQuery: string): Promise<void> {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchPending(false);
      setLoading(false);
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    const result = await searchIdentities(token, trimmed);
    setLoading(false);
    setSearchPending(false);

    if (!result.ok) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setSuggestions(result.data.identities);
    setOpen(result.data.identities.length > 0);
  }

  const showSpinner = loading || checking || searchPending;

  function handleInputChange(nextValue: string): void {
    setQuery(nextValue);
    const selectedLabel = value ? formatIdentityName(value) : "";
    if (value && nextValue !== selectedLabel) {
      onChange(null);
      onFieldError(null);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = nextValue.trim();
    if (!trimmed) {
      setSearchPending(false);
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setSearchPending(true);
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(nextValue);
    }, 300);
  }

  async function selectIdentity(identity: CustomerIdentity): Promise<void> {
    onChange(identity);
    setQuery(formatIdentityName(identity));
    setOpen(false);
    setSuggestions([]);
    await runEligibilityCheck(identity);
  }

  async function handleBlur(): Promise<void> {
    window.setTimeout(() => setOpen(false), 150);

    const trimmed = query.trim();
    if (!trimmed || value) return;

    if (trimmed.startsWith("idt_")) {
      setSearchPending(true);
      setLoading(true);
      const result = await searchIdentities(token, trimmed, 1);
      setLoading(false);
      setSearchPending(false);
      if (result.ok && result.data.identities[0]) {
        await selectIdentity(result.data.identities[0]);
      }
    }
  }

  return (
    <div className="relative">
      <input
        type="hidden"
        name="blnk_identity_id"
        value={value?.identity_id ?? ""}
        required
        readOnly
      />
      <Input
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => void handleBlur()}
        disabled={disabled}
        placeholder="Search by name or paste identity ID"
        error={!!error}
        autoComplete="off"
      />
      <AnimatePresence>
        {showSpinner ? (
          <motion.div
            key="identity-field-spinner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
          >
            <LoaderCircle className="h-4 w-4 animate-spin text-platform-muted" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {open && (
        <div className="absolute z-[110] mt-1 w-full overflow-hidden rounded-[6px] border border-platform-input-border bg-platform-input-main-bg py-1 shadow-md">
          {loading || searchPending ? (
            <div className="px-3 py-2 text-sm text-platform-muted">Searching…</div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-platform-muted">
              No customers found.
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {suggestions.map((identity) => {
                const name = formatIdentityName(identity);

                return (
                  <li key={identity.identity_id}>
                    <button
                      type="button"
                      className={cn(
                        "relative flex w-full cursor-pointer select-none items-start gap-2 px-3 py-2 text-left outline-none transition-colors hover:bg-platform-hover-bg focus:bg-platform-hover-bg",
                        value?.identity_id === identity.identity_id &&
                          "bg-platform-hover-bg"
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void selectIdentity(identity)}
                    >
                      <div className="flex h-5 shrink-0 items-center">
                        <IdentityIcon color="#566873" className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-platform-primary-text">
                          {name}
                        </span>
                        <span className="block truncate text-xs font-medium leading-4 text-platform-muted">
                          {identity.identity_id}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
