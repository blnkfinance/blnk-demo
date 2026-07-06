import { Suspense } from "react";
import { LoanDetailPageLoading } from "@/components/loans/loan-detail-loading";
import { LoanDetailSkeleton } from "@/components/loans/loan-detail-skeleton";

function LoanDetailLoadingFallback() {
  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-1.5 text-sm text-platform-muted">
        <span>Loans</span>
      </div>
      <LoanDetailSkeleton />
    </div>
  );
}

export default function Loading() {
  return (
    <Suspense fallback={<LoanDetailLoadingFallback />}>
      <LoanDetailPageLoading />
    </Suspense>
  );
}
