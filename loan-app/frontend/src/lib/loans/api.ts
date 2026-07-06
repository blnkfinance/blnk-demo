import {
  apiMutation,
  apiRequest,
  appendToken,
} from "../api-client";
import type {
  ApproveLoanResponse,
  CreateLoanInput,
  CreateLoanResponse,
  Loan,
  LoanDetailResponse,
  LoanLedgerTransactionKind,
  LoanLedgerTransactionsResponse,
  LoanListFilters,
  LoanListResponse,
  PayScheduleLineResponse,
  ScheduleLine,
  SimulateInterestAccrualResponse,
} from "./types";

function buildListQuery(filters: LoanListFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.offset != null) params.set("offset", String(filters.offset));
  if (filters.include_customer != null) {
    params.set("include_customer", String(filters.include_customer));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function listLoans(
  token: string,
  filters: LoanListFilters = {}
) {
  const query = buildListQuery(filters);
  const url = `/loans${query}${query ? "&" : "?"}token=${encodeURIComponent(token)}`;

  return apiRequest<LoanListResponse>({
    path: url,
    fallbackError: "Failed to load loans",
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      Array.isArray((body as LoanListResponse).loans),
  });
}

export async function getLoan(token: string, loanId: string) {
  return apiRequest<LoanDetailResponse>({
    path: appendToken(`/loans/${encodeURIComponent(loanId)}`, token),
    fallbackError: "Failed to load loan",
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      (body as LoanDetailResponse).loan != null,
  });
}

export async function createLoan(token: string, input: CreateLoanInput) {
  return apiMutation<CreateLoanResponse>({
    path: appendToken("/loans", token),
    fallbackError: "Failed to create loan",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      (body as CreateLoanResponse).loan != null,
  });
}

export async function approveLoan(token: string, loanId: string) {
  const result = await apiMutation<ApproveLoanResponse>({
    path: appendToken(`/loans/${encodeURIComponent(loanId)}/approve`, token),
    fallbackError: "Failed to approve loan",
    init: { method: "POST" },
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      (body as ApproveLoanResponse).loan != null &&
      Array.isArray((body as ApproveLoanResponse).schedule),
  });

  if (!result.ok) return result;
  return {
    ok: true as const,
    loan: result.data.loan,
    schedule: result.data.schedule,
  };
}

export async function rejectLoan(
  token: string,
  loanId: string,
  decisionNote?: string | null
) {
  const result = await apiMutation<{ loan: Loan }>({
    path: appendToken(`/loans/${encodeURIComponent(loanId)}/reject`, token),
    fallbackError: "Failed to reject loan",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision_note: decisionNote ?? null }),
    },
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      (body as { loan?: Loan }).loan != null,
  });

  if (!result.ok) return result;
  return { ok: true as const, loan: result.data.loan };
}

export async function payScheduleLine(
  token: string,
  loanId: string,
  loanScheduleId: string
) {
  const result = await apiMutation<PayScheduleLineResponse>({
    path: appendToken(
      `/loans/${encodeURIComponent(loanId)}/schedule/${encodeURIComponent(loanScheduleId)}/pay`,
      token
    ),
    fallbackError: "Failed to mark installment paid",
    init: { method: "POST" },
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      (body as PayScheduleLineResponse).line != null &&
      (body as PayScheduleLineResponse).repayment != null,
  });

  if (!result.ok) return result;
  return {
    ok: true as const,
    line: result.data.line,
    repayment: result.data.repayment,
  };
}

export async function simulateInterestAccrual(
  token: string,
  loanId: string,
  loanScheduleId: string
) {
  const result = await apiMutation<SimulateInterestAccrualResponse>({
    path: appendToken(
      `/loans/${encodeURIComponent(loanId)}/schedule/${encodeURIComponent(loanScheduleId)}/simulate-interest`,
      token
    ),
    fallbackError: "Failed to simulate interest accrual",
    init: { method: "POST" },
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      typeof (body as SimulateInterestAccrualResponse).transaction_count === "number" &&
      (body as SimulateInterestAccrualResponse).line != null,
  });

  if (!result.ok) return result;
  return { ok: true as const, ...result.data };
}

export async function markScheduleLineDue(
  token: string,
  loanId: string,
  loanScheduleId: string
) {
  const result = await apiMutation<{ line: ScheduleLine }>({
    path: appendToken(
      `/loans/${encodeURIComponent(loanId)}/schedule/${encodeURIComponent(loanScheduleId)}/mark-due`,
      token
    ),
    fallbackError: "Failed to mark installment due",
    init: { method: "POST" },
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      (body as { line?: ScheduleLine }).line != null,
  });

  if (!result.ok) return result;
  return { ok: true as const, line: result.data.line };
}

export async function listLoanLedgerTransactions(
  token: string,
  loanId: string,
  kind: LoanLedgerTransactionKind,
  page = 1
) {
  const params = new URLSearchParams({
    kind,
    page: String(page),
    pageSize: "50",
  });

  return apiRequest<LoanLedgerTransactionsResponse>({
    path: appendToken(
      `/loans/${encodeURIComponent(loanId)}/ledger-transactions?${params.toString()}`,
      token
    ),
    fallbackError: "Failed to load ledger transactions",
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      Array.isArray((body as LoanLedgerTransactionsResponse).transactions),
  });
}
