"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GoBackArrow from "@/components/blnk-icons/go-back-arrow";
import { LoanDetailSkeleton } from "@/components/loans/loan-detail-skeleton";
import {
  DEFAULT_LOAN_LIST_STATUS,
  loansListPath,
  parseLoanListStatus,
} from "@/lib/loans/list-route";
import { withToken } from "@/lib/portal-token";

export function LoanDetailPageLoading() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const listStatus =
    parseLoanListStatus(searchParams.get("list_status")) ??
    DEFAULT_LOAN_LIST_STATUS;
  const backHref = token ? withToken(loansListPath(listStatus), token) : "#";

  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-platform-muted transition-colors hover:text-platform-primary-text"
      >
        <GoBackArrow />
        <span>Loans</span>
      </Link>
      <LoanDetailSkeleton />
    </div>
  );
}
