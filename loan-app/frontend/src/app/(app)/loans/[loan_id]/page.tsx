"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import GoBackArrow from "@/components/blnk-icons/go-back-arrow";
import { LoanDetailMain } from "@/components/loans/loan-detail-main";
import { LoanDetailSidebar } from "@/components/loans/loan-detail-sidebar";
import { LoanDetailSkeleton } from "@/components/loans/loan-detail-skeleton";
import { ProductSheet } from "@/components/products/product-sheet";
import { getLoan } from "@/lib/loans/api";
import { loansListPath, parseLoanListStatus, DEFAULT_LOAN_LIST_STATUS } from "@/lib/loans/list-route";
import type {
  CustomerIdentity,
  Loan,
  LoanBalanceBreakdown,
  LoanRepaymentLine,
  ScheduleLine,
} from "@/lib/loans/types";
import { withToken } from "@/lib/portal-token";
import { getProduct } from "@/lib/products/api";
import { showLoadError } from "@/lib/toast";

export default function LoanDetailPage() {
  const params = useParams<{ loan_id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const loanId = params.loan_id;

  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<ScheduleLine[]>([]);
  const [repayments, setRepayments] = useState<LoanRepaymentLine[]>([]);
  const [balanceBreakdown, setBalanceBreakdown] = useState<LoanBalanceBreakdown | null>(
    null
  );
  const [customer, setCustomer] = useState<CustomerIdentity | null>(null);
  const [productName, setProductName] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [productSheetOpen, setProductSheetOpen] = useState(false);

  const refreshLoanDetail = useCallback(
    async (options?: { notifyBreakdownError?: boolean }) => {
      if (!token || !loanId) return false;

      const result = await getLoan(token, loanId);
      if (!result.ok) {
        showLoadError("loan", result.message);
        return false;
      }

      setLoan(result.data.loan);
      setSchedule(result.data.schedule);
      setRepayments(result.data.repayments ?? []);
      setBalanceBreakdown(result.data.balance_breakdown ?? null);
      setCustomer(result.data.customer ?? null);

      if (
        options?.notifyBreakdownError &&
        result.data.loan.status === "approved" &&
        result.data.loan.blnk_identity_id &&
        result.data.balance_breakdown == null
      ) {
        showLoadError(
          "balance breakdown",
          "Live ledger balances are unavailable right now."
        );
      }

      const productResult = await getProduct(token, result.data.loan.loan_product_id);
      if (productResult.ok) {
        setProductName(productResult.product.name);
      }

      return true;
    },
    [token, loanId]
  );

  useEffect(() => {
    if (!token || !loanId) return;

    setLoading(true);
    setLoan(null);
    setSchedule([]);
    setRepayments([]);
    setBalanceBreakdown(null);
    setCustomer(null);
    setProductName(undefined);

    void refreshLoanDetail({ notifyBreakdownError: true }).finally(() => setLoading(false));
  }, [token, loanId, refreshLoanDetail]);

  if (!token) {
    return null;
  }

  const listStatus =
    parseLoanListStatus(searchParams.get("list_status")) ??
    loan?.status ??
    DEFAULT_LOAN_LIST_STATUS;
  const backHref = withToken(loansListPath(listStatus), token);
  const showSkeleton = loading || loan?.loan_id !== loanId;

  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-platform-muted transition-colors hover:text-platform-primary-text"
      >
        <GoBackArrow />
        <span>Loans</span>
      </Link>

      {showSkeleton ? (
        <LoanDetailSkeleton />
      ) : !loan ? (
        <div className="py-16 text-center text-sm text-platform-muted">
          Loan not found.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,2fr)]">
            <LoanDetailMain
              loan={loan}
              schedule={schedule}
              repayments={repayments}
              balanceBreakdown={balanceBreakdown}
              token={token}
              onLoanUpdated={setLoan}
              onLoanApproved={({ loan: approvedLoan, schedule: approvedSchedule }) => {
                setLoan(approvedLoan);
                setSchedule(approvedSchedule);
              }}
              onScheduleLineUpdated={(line) => {
                setSchedule((current) =>
                  current.map((entry) =>
                    entry.loan_schedule_id === line.loan_schedule_id ? line : entry
                  )
                );
              }}
              onRepaymentAdded={(repayment) => {
                setRepayments((current) =>
                  [...current, repayment].sort((a, b) => a.period - b.period)
                );
              }}
              onLoanDetailRefresh={() => {
                void refreshLoanDetail();
              }}
            />
            <LoanDetailSidebar
              loan={loan}
              customer={customer}
              productName={productName}
              onProductClick={() => setProductSheetOpen(true)}
            />
          </div>

          <ProductSheet
            token={token}
            mode={productSheetOpen ? "view" : "closed"}
            productId={loan.loan_product_id}
            onClose={() => setProductSheetOpen(false)}
            onSaved={() => {}}
          />
        </>
      )}
    </div>
  );
}
