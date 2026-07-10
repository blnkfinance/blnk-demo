"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { repayLoanAction } from "@/lib/loan-actions";

export function RepayButton({
  loanId,
  label,
}: {
  loanId: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRepay() {
    if (!confirm("Repay the next due instalment from your wallet?")) return;
    setPending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("loan_id", loanId);
      const result = await repayLoanAction(null, formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch {
      setError("Repayment failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleRepay}
        disabled={pending}
        className="mt-3 btn-primary disabled:opacity-50"
      >
        {pending ? "Processing..." : label}
      </button>
      {error && (
        <p className="mt-2 text-sm font-medium text-error">{error}</p>
      )}
    </div>
  );
}
