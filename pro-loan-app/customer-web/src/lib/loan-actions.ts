"use server";

import { revalidatePath } from "next/cache";
import { api } from "./api";

export async function quoteLoanAction(input: {
  product_id: string;
  principal_cents: number;
  term_months: number;
}) {
  const params = new URLSearchParams({
    product_id: input.product_id,
    principal_cents: String(input.principal_cents),
    term_months: String(input.term_months),
  });

  try {
    return await api.get<{
      disbursement: {
        requested_principal_cents: number;
        origination_fee_cents: number;
        total_deductions_cents: number;
        net_disbursement_cents: number;
        currency: string;
      };
      estimated_emi_cents: number;
    }>(`/loans/quote?${params.toString()}`);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Quote failed" };
  }
}

export async function applyAction(_prevState: unknown, formData: FormData) {
  const productId = formData.get("product_id") as string;
  const principalCents = Math.round(
    parseFloat(formData.get("principal_cents") as string)
  );
  const termMonths = parseInt(formData.get("term_months") as string, 10);

  let loan: { id: string };
  try {
    loan = await api.post<{ id: string }>("/loans", {
      product_id: productId,
      principal_cents: principalCents,
      term_months: termMonths,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Application failed" };
  }

  try {
    await api.post(`/loans/${loan.id}/submit`, {});
  } catch {
    // non-fatal: loan exists, submit can be retried
  }

  revalidatePath("/");
  return { loanId: loan.id };
}

export async function repayLoanAction(_prevState: unknown, formData: FormData) {
  const loanId = formData.get("loan_id") as string;

  if (!loanId) return { error: "Loan ID is required" };

  try {
    await api.post(`/loans/${loanId}/repay`, {});
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Repayment failed" };
  }

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/loans");
  revalidatePath("/");
  return { success: true };
}
