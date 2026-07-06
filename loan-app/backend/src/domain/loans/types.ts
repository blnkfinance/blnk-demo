export type LoanStatus = "pending_approval" | "approved" | "rejected";

export type SchedulePaymentStatus = "scheduled" | "due" | "paid" | "overdue" | "void";

export type DayCountConvention = "actual_360" | "actual_365" | "30_360";
export type PaymentFrequency = "weekly" | "biweekly" | "monthly";
export type AmortizationType = "equal_installments" | "equal_principal" | "bullet";
export type GracePeriodType = "none" | "interest_only" | "full";

export type LoanProductSnapshot = {
  loan_product_id: string;
  annual_rate_bps: number;
  day_count_convention: DayCountConvention;
  payment_frequency: PaymentFrequency;
  amortization_type: AmortizationType;
  grace_period_type: GracePeriodType;
  grace_period_days: number | null;
  status: "active" | "archived";
};

export type CreateLoanInput = {
  loan_product_id: string;
  blnk_identity_id: string;
  principal: number;
  origination_fee: number;
  term_periods: number;
  first_payment_date: string;
};

export type Loan = {
  loan_id: string;
  blnk_identity_id: string | null;
  loan_product_id: string;
  principal: number;
  origination_fee: number;
  net_disbursement: number;
  term_periods: number;
  first_payment_date: string;
  annual_rate_bps: number;
  day_count_convention: DayCountConvention;
  payment_frequency: PaymentFrequency;
  amortization_type: AmortizationType;
  grace_period_type: GracePeriodType;
  grace_period_days: number | null;
  maturity_date: string;
  effective_annual_rate_bps: number;
  disbursement_date: string | null;
  status: LoanStatus;
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
};

export type ScheduleLineDraft = {
  period: number;
  payment_date: string;
  principal: number;
  interest: number;
  expected_payment: number;
  closing_principal: number;
  carrying_amount: number;
  eir_interest: number;
  fee_income: number;
  status: SchedulePaymentStatus;
};

export type ScheduleLine = ScheduleLineDraft & {
  loan_id: string;
  loan_schedule_id: string;
};

export type LoanDraft = Omit<Loan, "loan_id" | "created_at">;

export type ScheduleTerms = {
  principal: number;
  term_periods: number;
  first_payment_date: string;
  accrual_start_date: string;
  annual_rate_bps: number;
  day_count_convention: DayCountConvention;
  payment_frequency: PaymentFrequency;
  amortization_type: AmortizationType;
  grace_period_type: GracePeriodType;
  grace_period_days: number | null;
};

export type DomainError = { ok: false; error: string };
export type DomainOk<T> = { ok: true; value: T };
export type DomainResult<T> = DomainOk<T> | DomainError;

export function domainOk<T>(value: T): DomainOk<T> {
  return { ok: true, value };
}

export function domainErr(error: string): DomainError {
  return { ok: false, error };
}
