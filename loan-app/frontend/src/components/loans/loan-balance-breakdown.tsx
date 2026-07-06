"use client";

import type { ReactNode } from "react";
import SectionHeader from "@/components/blnk-ui/section-header";
import GoBackArrow from "@/components/blnk-icons/go-back-arrow";
import {
  buildCloudTransactionsByDestinationUrl,
  buildCloudTransactionsBySourceUrl,
  navigateToCloud,
} from "@/lib/blnk-cloud-links";
import { formatMoney } from "@/lib/loans/labels";
import type { LoanBalanceBreakdown, LoanRepaymentLine } from "@/lib/loans/types";
import { usePortalSession } from "@/lib/portal-session";

type LoanBalanceBreakdownSectionProps = {
  balanceBreakdown: LoanBalanceBreakdown | null;
  repayments: LoanRepaymentLine[];
};

function MetricField({
  label,
  children,
  footer,
}: {
  label: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium leading-[14px] text-platform-muted">
        {label}
      </h3>
      <p className="font-pastiche text-[20px] font-semibold leading-[150%] text-platform-nav-text">
        {children}
      </p>
      {footer ? <div className="mt-2">{footer}</div> : null}
    </div>
  );
}

function totalRepaidFromRepayments(repayments: LoanRepaymentLine[]): number {
  return repayments.reduce((sum, repayment) => sum + repayment.total_amount_paid, 0);
}

function LedgerLink({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  if (disabled) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sm font-normal text-platform-button-text-button underline-offset-2 hover:underline"
    >
      {label}
      <GoBackArrow className="h-4 w-4 shrink-0 scale-x-[-1]" />
    </button>
  );
}

export function LoanBalanceBreakdownSection({
  balanceBreakdown,
  repayments,
}: LoanBalanceBreakdownSectionProps) {
  const { blnkCloudApiOrigin } = usePortalSession();

  const totalRepaid =
    balanceBreakdown?.total_repaid ?? totalRepaidFromRepayments(repayments);

  function openPrincipalRepaymentTransactions(balanceId: string | undefined) {
    if (!balanceId) return;
    navigateToCloud(
      buildCloudTransactionsByDestinationUrl(blnkCloudApiOrigin, balanceId)
    );
  }

  function openAccruedInterestTransactions(balanceId: string | undefined) {
    if (!balanceId) return;
    navigateToCloud(
      buildCloudTransactionsBySourceUrl(blnkCloudApiOrigin, balanceId)
    );
  }

  return (
    <section className="mt-10 space-y-4">
      <SectionHeader
        title="Loan balance breakdown"
        subtitle="Live loan ledger balances and repayments recorded in this app."
      />

      <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
        <MetricField
          label="Remaining principal"
          footer={
            <LedgerLink
              label="View principal payments"
              disabled={!balanceBreakdown?.loans_receivable_balance_id}
              onClick={() =>
                openPrincipalRepaymentTransactions(
                  balanceBreakdown?.loans_receivable_balance_id
                )
              }
            />
          }
        >
          {balanceBreakdown ? (
            formatMoney(balanceBreakdown.remaining_principal)
          ) : (
            <span className="text-platform-muted">—</span>
          )}
        </MetricField>

        <MetricField
          label="Accrued interest"
          footer={
            <LedgerLink
              label="View accrued interest"
              disabled={!balanceBreakdown?.accrued_interest_balance_id}
              onClick={() =>
                openAccruedInterestTransactions(
                  balanceBreakdown?.accrued_interest_balance_id
                )
              }
            />
          }
        >
          {balanceBreakdown ? (
            formatMoney(balanceBreakdown.accrued_interest)
          ) : (
            <span className="text-platform-muted">—</span>
          )}
        </MetricField>

        <MetricField label="Total repaid">
          {formatMoney(totalRepaid)}
        </MetricField>
      </div>
    </section>
  );
}
