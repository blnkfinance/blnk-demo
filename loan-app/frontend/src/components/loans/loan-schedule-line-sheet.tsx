"use client";

import { useState } from "react";
import { InfoField, InfoSection } from "@/components/blnk-ui/info-section";
import ModalSheet from "@/components/blnk-ui/modal-sheet";
import Header from "@/components/blnk-ui/summary-layout/header";
import SchedulePaymentStatusPill from "@/components/loans/schedule-payment-status";
import TransactionAppliedIcon from "@/components/blnk-icons/transaction-applied-icon";
import TransactionInflightIcon from "@/components/blnk-icons/transaction-inflight-icon";
import WandIcon from "@/components/blnk-icons/wand-icon";
import { Button } from "@/components/ui/button";
import { formatDisplayDate } from "@/lib/format";
import { payScheduleLine, markScheduleLineDue, simulateInterestAccrual } from "@/lib/loans/api";
import { formatMoney } from "@/lib/loans/labels";
import type { Loan, LoanRepaymentLine, ScheduleLine } from "@/lib/loans/types";
import { showActionError, showSuccessToast } from "@/lib/toast";

type LoanScheduleLineSheetProps = {
  line: ScheduleLine | null;
  loan: Loan;
  token: string;
  onClose: () => void;
  onScheduleLineUpdated: (line: ScheduleLine) => void;
  onRepaymentAdded: (repayment: LoanRepaymentLine) => void;
  onLoanDetailRefresh: () => void;
};

function MoneyValue({ amount }: { amount: number }) {
  return <span className="tabular-nums">{formatMoney(amount)}</span>;
}

export function LoanScheduleLineSheet({
  line,
  loan,
  token,
  onClose,
  onScheduleLineUpdated,
  onRepaymentAdded,
  onLoanDetailRefresh,
}: LoanScheduleLineSheetProps) {
  const [markingPaid, setMarkingPaid] = useState(false);
  const [markingDue, setMarkingDue] = useState(false);
  const [simulatingAccrual, setSimulatingAccrual] = useState(false);
  const title = line
    ? formatDisplayDate(line.payment_date)
    : "Schedule period";
  const showDemoActions =
    loan.status === "approved" && line != null && line.status !== "void";
  const canMarkPaid =
    (line?.status === "scheduled" ||
      line?.status === "due" ||
      line?.status === "overdue") &&
    loan.status === "approved";
  const canMarkDue = line?.status === "scheduled" && loan.status === "approved";
  const canSimulateAccrual = line?.interest_blnk_transaction == null;
  const actionBusy = markingPaid || markingDue || simulatingAccrual;

  async function handleMarkPaid() {
    if (!line) return;

    setMarkingPaid(true);
    const result = await payScheduleLine(token, loan.loan_id, line.loan_schedule_id);
    setMarkingPaid(false);

    if (!result.ok) {
      showActionError({ action: "mark installment paid", message: result.message });
      return;
    }

    onScheduleLineUpdated(result.line);
    onRepaymentAdded({
      ...result.repayment,
      period: result.line.period,
      payment_date: result.line.payment_date,
      principal: result.line.principal,
      interest: result.line.interest,
      expected_payment: result.line.expected_payment,
    });
    onLoanDetailRefresh();
    showSuccessToast(
      "Installment marked paid",
      `Period ${result.line.period} is now paid.`
    );
  }

  async function handleMarkDue() {
    if (!line) return;

    setMarkingDue(true);
    const result = await markScheduleLineDue(token, loan.loan_id, line.loan_schedule_id);
    setMarkingDue(false);

    if (!result.ok) {
      showActionError({ action: "mark installment due", message: result.message });
      return;
    }

    onScheduleLineUpdated(result.line);
    showSuccessToast(
      "Installment marked due",
      `Period ${result.line.period} is now due.`
    );
  }

  async function handleSimulateAccrual() {
    if (!line) return;

    setSimulatingAccrual(true);
    const result = await simulateInterestAccrual(
      token,
      loan.loan_id,
      line.loan_schedule_id
    );
    setSimulatingAccrual(false);

    if (!result.ok) {
      showActionError({ action: "simulate interest accrual", message: result.message });
      return;
    }

    onScheduleLineUpdated(result.line);
    onLoanDetailRefresh();
    showSuccessToast(
      "Interest accrual simulated",
      `${result.transaction_count} daily transactions posted for period ${line.period}.`
    );
  }

  return (
    <ModalSheet show={line != null} onClose={onClose} title={title}>
      {line ? (
        <>
          <div className="mt-6 mb-8 space-y-2">
            <p className="text-sm font-medium leading-[14px] text-platform-primary-text">
              Period {line.period}
            </p>
            <Header
              title={formatDisplayDate(line.payment_date)}
              accessory={<SchedulePaymentStatusPill status={line.status} />}
            />
          </div>
          <section className="space-y-10">
            <InfoSection title="Payment">
              <InfoField label="Principal">
                <MoneyValue amount={line.principal} />
              </InfoField>
              <InfoField label="Interest">
                <MoneyValue amount={line.interest} />
              </InfoField>
              <InfoField label="Expected payment">
                <MoneyValue amount={line.expected_payment} />
              </InfoField>
            </InfoSection>

            <InfoSection title="EIR amortization">
              <InfoField label="Closing principal">
                <MoneyValue amount={line.closing_principal} />
              </InfoField>
              <InfoField label="Carrying amount">
                <MoneyValue amount={line.carrying_amount} />
              </InfoField>
              <InfoField label="EIR interest">
                <MoneyValue amount={line.eir_interest} />
              </InfoField>
              <InfoField label="Fee income">
                <MoneyValue amount={line.fee_income} />
              </InfoField>
            </InfoSection>
          </section>

          {showDemoActions ? (
            <div className="sticky bottom-0 z-10 -mx-8 mt-10 flex flex-col space-y-[10px] border-t border-platform-stroke bg-platform-nav-bg px-8 py-4">
              <h3 className="text-[10px] font-pastiche font-medium uppercase leading-3 tracking-[0.5px] text-platform-primary-text">
                Demo actions
              </h3>
              {canMarkDue ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-auto w-full gap-1.5 px-3 py-2 text-platform-button-text-color"
                  onClick={() => void handleMarkDue()}
                  disabled={actionBusy}
                >
                  <TransactionInflightIcon
                    className="h-4 w-4 shrink-0 text-platform-muted"
                    fill="currentColor"
                  />
                  {markingDue ? "Marking due…" : "Mark as due"}
                </Button>
              ) : null}
              {canMarkPaid ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-auto w-full gap-1.5 px-3 py-2 text-platform-button-text-color"
                  onClick={() => void handleMarkPaid()}
                  disabled={actionBusy}
                >
                  <TransactionAppliedIcon
                    className="h-4 w-4 shrink-0 text-platform-muted"
                    fill="currentColor"
                  />
                  {markingPaid ? "Marking paid…" : "Mark as paid"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                className="h-auto w-full gap-1.5 px-3 py-2 text-platform-button-text-color"
                onClick={() => void handleSimulateAccrual()}
                disabled={actionBusy || !canSimulateAccrual}
              >
                <WandIcon
                  className="h-4 w-4 shrink-0 text-platform-muted"
                  fill="currentColor"
                />
                {simulatingAccrual
                  ? "Simulating accrual…"
                  : canSimulateAccrual
                    ? "Simulate interest accrual"
                    : "Interest accrual simulated"}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </ModalSheet>
  );
}
