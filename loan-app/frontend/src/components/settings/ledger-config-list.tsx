"use client";

import LedgerIcon from "@/components/blnk-icons/ledger-icon";
import CopyInput from "@/components/blnk-ui/copy-input";
import type { LoanLedger } from "@/lib/settings/types";

type LedgerConfigListProps = {
  ledgers: LoanLedger[];
};

export function LedgerConfigList({ ledgers }: LedgerConfigListProps) {
  return (
    <div className="w-full">
      <div className="flex flex-row items-center gap-x-4 border-b border-platform-stroke pb-2">
        <span className="w-[280px] shrink-0 py-2 pl-2 text-[10px] font-pastiche font-medium uppercase leading-3 tracking-[0.5px] text-platform-primary-text">
          Ledger
        </span>
        <span className="flex-1 py-2 pl-4 text-[10px] font-pastiche font-medium uppercase leading-3 tracking-[0.5px] text-platform-primary-text">
          Ledger ID
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {ledgers.map((ledger) => (
          <div
            key={ledger.ledger_key}
            className="flex flex-row items-center gap-x-4"
          >
            <div className="flex w-[280px] shrink-0 items-center gap-2 pl-2">
              <LedgerIcon className="h-4 w-4 shrink-0" fill="#566873" />
              <span className="min-w-0 text-sm font-medium text-platform-primary-text">
                {ledger.name}
              </span>
            </div>
            <div className="min-w-0 flex-1 pl-4">
              <CopyInput
                value={ledger.blnk_ledger_id}
                fieldName={`ledger_${ledger.ledger_key}`}
                compact
                className="font-mono text-platform-button-text-color"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
