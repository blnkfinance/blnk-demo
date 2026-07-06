"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import CopyInput from "@/components/blnk-ui/copy-input";
import FormattedDate from "@/components/blnk-ui/formatted-date";
import SectionHeader from "@/components/blnk-ui/section-header";
import StackIcon from "@/components/blnk-icons/stack-icon";
import { LoanDetailActions } from "@/components/loans/loan-detail-actions";
import LoanStatusPill from "@/components/loans/loan-status";
import {
  LoanScheduleTable,
  SCHEDULE_PREVIEW_ROW_COUNT,
} from "@/components/loans/loan-schedule-table";
import {
  LoanRepaymentTable,
  REPAYMENT_PREVIEW_ROW_COUNT,
} from "@/components/loans/loan-repayment-table";
import { LoanBalanceBreakdownSection } from "@/components/loans/loan-balance-breakdown";
import { Button } from "@/components/ui/button";
import { buildCloudTransactionsByQueuedParentUrl } from "@/lib/blnk-cloud-links";
import { formatMoney } from "@/lib/loans/labels";
import type { Loan, LoanBalanceBreakdown, LoanRepaymentLine, ScheduleLine } from "@/lib/loans/types";
import { usePortalSession } from "@/lib/portal-session";

type LoanDetailMainProps = {
  loan: Loan;
  schedule: ScheduleLine[];
  repayments: LoanRepaymentLine[];
  balanceBreakdown: LoanBalanceBreakdown | null;
  token: string;
  onScheduleLineUpdated: (line: ScheduleLine) => void;
  onRepaymentAdded: (repayment: LoanRepaymentLine) => void;
  onLoanDetailRefresh: () => void;
  onLoanUpdated: (loan: Loan) => void;
  onLoanApproved: (result: { loan: Loan; schedule: ScheduleLine[] }) => void;
};

function MetricField({
  label,
  children,
  alignWithInput = false,
}: {
  label: string;
  children: ReactNode;
  alignWithInput?: boolean;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium leading-[14px] text-platform-muted">
        {label}
      </h3>
      {alignWithInput ? (
        <div className="flex min-h-10 w-full items-center text-sm font-medium leading-[150%] text-platform-nav-text">
          {children}
        </div>
      ) : (
        <p className="text-sm font-medium leading-[150%] text-platform-nav-text">
          {children}
        </p>
      )}
    </div>
  );
}

export function LoanDetailMain({
  loan,
  schedule,
  repayments,
  balanceBreakdown,
  token,
  onScheduleLineUpdated,
  onRepaymentAdded,
  onLoanDetailRefresh,
  onLoanUpdated,
  onLoanApproved,
}: LoanDetailMainProps) {
  const [fullScheduleOpen, setFullScheduleOpen] = useState(false);
  const [fullRepaymentOpen, setFullRepaymentOpen] = useState(false);
  const hasMoreSchedule = schedule.length > SCHEDULE_PREVIEW_ROW_COUNT;
  const hasMoreRepayments = repayments.length > REPAYMENT_PREVIEW_ROW_COUNT;
  const { blnkCloudApiOrigin } = usePortalSession();

  return (
    <div className="min-w-0">
      <section className="space-y-6 pb-8">
        <div className="space-y-2">
          <h3 className="mb-[8px] border-b border-platform-stroke py-2 font-pastiche text-[10px] font-medium uppercase leading-3 tracking-[0.5px] text-platform-primary-text">
            Principal amount
          </h3>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <p className="font-pastiche text-xl font-semibold leading-tight text-platform-nav-text sm:text-[32px] sm:leading-[32px]">
                {formatMoney(loan.principal)}
              </p>
              <LoanStatusPill status={loan.status} className="shrink-0" />
            </div>
            <LoanDetailActions
              token={token}
              loan={loan}
              onLoanUpdated={onLoanUpdated}
              onLoanApproved={onLoanApproved}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
          <MetricField label="Net disbursement">
            {formatMoney(loan.net_disbursement)}
          </MetricField>
          <MetricField label="Origination fee">
            {formatMoney(loan.origination_fee)}
          </MetricField>
          <MetricField label="Created at">
            <FormattedDate value={loan.created_at} showTime />
          </MetricField>
          <MetricField label="Loan ID" alignWithInput>
            <CopyInput
              value={loan.loan_id}
              fieldName="loan_id"
              compact
              className="text-platform-button-text-color"
            />
          </MetricField>
          <MetricField label="Omni transaction" alignWithInput>
            {loan.blnk_transaction ? (
              <CopyInput
                value={loan.blnk_transaction}
                fieldName="blnk_transaction"
                compact
                className="text-platform-button-text-color"
                href={buildCloudTransactionsByQueuedParentUrl(
                  blnkCloudApiOrigin,
                  loan.blnk_transaction
                )}
              />
            ) : (
              <span className="text-platform-muted">—</span>
            )}
          </MetricField>
        </div>
      </section>

      <LoanBalanceBreakdownSection
        balanceBreakdown={balanceBreakdown}
        repayments={repayments}
      />

      <section className="mt-16 space-y-2">
        <SectionHeader
          title="Payment schedule"
          subtitle={
            loan.status === "pending_approval" &&
            (loan.day_count_convention === "actual_360" ||
              loan.day_count_convention === "actual_365")
              ? "Indicative schedule based on the application date. Amounts finalize on approval."
              : "Expected payment schedule with deferred fee recognition per period."
          }
          rightContent={
            hasMoreSchedule ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setFullScheduleOpen(true)}
              >
                <StackIcon
                  className="mr-1.5 h-4 w-4 text-platform-muted"
                  fill="currentColor"
                />
                View full schedule
              </Button>
            ) : null
          }
        />
        <LoanScheduleTable
          loan={loan}
          schedule={schedule}
          token={token}
          fullScheduleOpen={fullScheduleOpen}
          onFullScheduleOpenChange={setFullScheduleOpen}
          onScheduleLineUpdated={onScheduleLineUpdated}
          onRepaymentAdded={onRepaymentAdded}
          onLoanDetailRefresh={onLoanDetailRefresh}
        />
      </section>

      <section className="mt-16 space-y-2">
        <SectionHeader
          title="Repayments"
          subtitle="Recorded repayments against the payment schedule."
          rightContent={
            hasMoreRepayments ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setFullRepaymentOpen(true)}
              >
                <StackIcon
                  className="mr-1.5 h-4 w-4 text-platform-muted"
                  fill="currentColor"
                />
                View full table
              </Button>
            ) : null
          }
        />
        <LoanRepaymentTable
          repayments={repayments}
          fullRepaymentOpen={fullRepaymentOpen}
          onFullRepaymentOpenChange={setFullRepaymentOpen}
        />
      </section>
    </div>
  );
}
