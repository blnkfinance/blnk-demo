"use server";

import { revalidatePath } from "next/cache";
import { api } from "./api";

type ActionResult = { success: true } | { error: string };

async function runLoanAction(
  loanId: string,
  call: () => Promise<unknown>
): Promise<ActionResult> {
  try {
    await call();
    revalidatePath("/loans", "layout");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Action failed" };
  }
}

export async function approveLoanAction(loanId: string) {
  return runLoanAction(loanId, () => api.post(`/loans/${loanId}/approve`, {}));
}

export async function rejectLoanAction(loanId: string, reason: string) {
  return runLoanAction(loanId, () =>
    api.post(`/loans/${loanId}/reject`, { reason })
  );
}

export async function disburseLoanAction(loanId: string) {
  return runLoanAction(loanId, () => api.post(`/loans/${loanId}/disburse`, {}));
}

export async function commitDisbursementAction(loanId: string) {
  return runLoanAction(loanId, () =>
    api.post(`/loans/${loanId}/disburse/commit`, {})
  );
}

export async function voidDisbursementAction(loanId: string) {
  return runLoanAction(loanId, () =>
    api.post(`/loans/${loanId}/disburse/void`, {})
  );
}

export async function recordPaymentAction(loanId: string, scheduleId: string) {
  return runLoanAction(loanId, () =>
    api.post(`/loans/${loanId}/schedule/${scheduleId}/pay`, {})
  );
}
