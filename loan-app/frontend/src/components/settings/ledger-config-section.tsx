"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ensureLoanLedgers, fetchLoanLedgers } from "@/lib/settings/api";
import type { LoanLedger } from "@/lib/settings/types";
import { showActionError, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { LedgerConfigList } from "./ledger-config-list";

type LedgerConfigurationSectionProps = {
  token: string;
};

export function LedgerConfigurationSection({
  token,
}: LedgerConfigurationSectionProps) {
  const [ledgers, setLedgers] = useState<LoanLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchLoanLedgers(token).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setLedgers(result.ledgers);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleRefresh() {
    setSyncing(true);
    setError(null);
    const result = await ensureLoanLedgers(token);
    setSyncing(false);
    if (!result.ok) {
      setError(result.message);
      showActionError({
        action: "refresh ledgers",
        message: result.message,
      });
      return;
    }
    setLedgers(result.ledgers);
    showSuccessToast(
      "Ledger configuration updated",
      "Ledger IDs have been synced from Core banking."
    );
  }

  return (
    <section id="ledger-configuration" className="scroll-mt-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="font-pastiche text-lg font-semibold leading-[125%] tracking-[-0.18px] text-platform-primary-text">
            Ledger configuration
          </h2>
          <p className="text-sm leading-[150%] text-platform-muted">
            These ledgers must exist in your Core banking for loan accounting.
          </p>
        </div>
        {!loading ? (
          <Button
            type="button"
            variant="secondary"
            aria-busy={syncing}
            className={cn(
              "h-8 shrink-0 gap-1.5 px-2 text-sm font-medium leading-4 text-platform-button-text-color",
              syncing && "pointer-events-none"
            )}
            onClick={() => void handleRefresh()}
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-colors duration-300 ease-in-out",
                syncing && "motion-safe:animate-[spin_1.25s_linear_infinite]",
                syncing ? "text-white" : "text-platform-muted"
              )}
            />
            Refresh
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-platform-muted">
          Loading ledgers…
        </div>
      ) : error && ledgers.length === 0 ? (
        <p className="text-sm text-platform-muted">{error}</p>
      ) : (
        <>
          <LedgerConfigList ledgers={ledgers} />
          {error ? (
            <p className="text-sm text-platform-muted">{error}</p>
          ) : null}
        </>
      )}
    </section>
  );
}
