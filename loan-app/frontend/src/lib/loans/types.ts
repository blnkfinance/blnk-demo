export type LoanStatus = "pending_approval" | "approved" | "rejected";

export type SchedulePaymentStatus = "scheduled" | "due" | "paid" | "overdue" | "void";

export type DayCountConvention = "actual_360" | "actual_365" | "30_360";
export type PaymentFrequency = "weekly" | "biweekly" | "monthly";
export type AmortizationType = "equal_installments" | "equal_principal" | "bullet";
export type GracePeriodType = "none" | "interest_only" | "full";

export type Loan = {
  loan_id: string;
  installed_app_id: string;
  blnk_identity_id: string | null;
  loan_product_id: string;
  principal: number;
  origination_fee: number;
  net_disbursement: number;
  term_periods: number;
  first_payment_date: string;
  maturity_date: string;
  annual_rate_bps: number;
  effective_annual_rate_bps: number;
  day_count_convention: DayCountConvention;
  payment_frequency: PaymentFrequency;
  amortization_type: AmortizationType;
  grace_period_type: GracePeriodType;
  grace_period_days: number | null;
  status: LoanStatus;
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
  disbursement_date: string | null;
  blnk_transaction: string | null;
};

export type ScheduleLine = {
  loan_schedule_id: string;
  loan_id: string;
  period: number;
  payment_date: string;
  principal: number;
  interest: number;
  expected_payment: number;
  closing_principal: number;
  carrying_amount: number;
  eir_interest: number;
  fee_income: number;
  interest_blnk_transaction: string | null;
  status: SchedulePaymentStatus;
};

export type CreateLoanInput = {
  loan_product_id: string;
  blnk_identity_id: string;
  principal: number;
  origination_fee: number;
  term_periods: number;
  first_payment_date: string;
};

export type LoanListFilters = {
  status?: LoanStatus;
  limit?: number;
  offset?: number;
  include_customer?: boolean;
};

export type LoanListItem = Loan & {
  customer: CustomerIdentity | null;
};

export type LoanListResponse = {
  loans: LoanListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type CustomerIdentity = {
  identity_id: string;
  first_name: string | null;
  last_name: string | null;
  email_address: string | null;
  display_name: string;
};

export type LoanBalanceBreakdown = {
  remaining_principal: number;
  accrued_interest: number;
  total_repaid: number;
  currency: string;
  loans_receivable_balance_id: string;
  accrued_interest_balance_id: string;
};

export type LoanLedgerTransactionKind = "interest_accrual" | "principal_repayment";

export type LoanLedgerTransaction = {
  transaction_id: string;
  amount: number;
  currency: string;
  created_at: string;
  reference: string | null;
  period: number | null;
  accrual_date: string | null;
};

export type LoanLedgerTransactionsResponse = {
  transactions: LoanLedgerTransaction[];
  total: number;
  page: number;
  pageSize: number;
};

export type GetLoanResponse = {
  loan: Loan;
  schedule: ScheduleLine[];
  repayments: LoanRepaymentLine[];
  balance_breakdown: LoanBalanceBreakdown | null;
  customer: CustomerIdentity | null;
};

export type LoanDetailResponse = GetLoanResponse;

export type ApproveLoanResponse = {
  loan: Loan;
  schedule: ScheduleLine[];
};

export type CreateLoanResponse = {
  loan: Loan;
  schedule: ScheduleLine[];
};

export type LoanRepayment = {
  loan_repayment_id: string;
  loan_id: string;
  loan_schedule_id: string;
  total_amount_paid: number;
  created_at: string;
};

export type LoanRepaymentLine = LoanRepayment & {
  period: number;
  payment_date: string;
  principal: number;
  interest: number;
  expected_payment: number;
};

export type PayScheduleLineResponse = {
  line: ScheduleLine;
  repayment: LoanRepayment;
};

export type SimulateInterestAccrualResponse = {
  transaction_count: number;
  total_interest: number;
  line: ScheduleLine;
};

export type SheetMode = "closed" | "create";
