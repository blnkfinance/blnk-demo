export type ProductStatus = "active" | "archived";

export type InterestType = "fixed";

export type DayCountConvention = "actual_360" | "actual_365" | "30_360";

export type PaymentFrequency = "weekly" | "biweekly" | "monthly";

export type AmortizationType =
  | "equal_installments"
  | "equal_principal"
  | "bullet";

export type GracePeriodType = "none" | "interest_only" | "full";

export type LoanProduct = {
  loan_product_id: string;
  name: string;
  interest_type: InterestType;
  annual_rate_bps: number;
  day_count_convention: DayCountConvention;
  payment_frequency: PaymentFrequency;
  amortization_type: AmortizationType;
  grace_period_type: GracePeriodType;
  grace_period_days: number | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
};

export type ProductListFilters = {
  status?: ProductStatus;
  interest_type?: InterestType;
  limit?: number;
  offset?: number;
};

export type ProductListResponse = {
  products: LoanProduct[];
  total: number;
  limit: number;
  offset: number;
};

export type CreateLoanProductInput = {
  name: string;
  interest_type: InterestType;
  annual_rate_bps: number;
  day_count_convention: DayCountConvention;
  payment_frequency: PaymentFrequency;
  amortization_type: AmortizationType;
  grace_period_type: GracePeriodType;
  grace_period_days?: number | null;
};

export type UpdateLoanProductInput = Partial<CreateLoanProductInput>;

export type SheetMode = "closed" | "view" | "create" | "edit";
