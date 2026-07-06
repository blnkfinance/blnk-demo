/**
 * Loan creation and approval orchestrators.
 *
 * Create: indicative schedule using date(created_at) as period-1 accrual start.
 * Approve: final schedule using disbursement_date = date(decided_at).
 */
import { computeOpeningCarryingAmount } from "./carrying.js";
import { applyEirAmortization, computeEffectiveAnnualRateBps } from "./eir.js";
import type { LoanProductForValidation } from "./invariants.js";
import { validateCreateLoanInput as validate } from "./invariants.js";
import { validateScheduleDraft } from "./schedule/validate.js";
import { computeMaturityDate } from "./maturity.js";
import { buildScheduleAccrualWindows } from "./schedule/accrual-windows.js";
import { buildExpectedCashFlow } from "./schedule/index.js";
import { todayDateOnlyUtc } from "./schedule/dates.js";
import type {
  CreateLoanInput,
  DayCountConvention,
  DomainResult,
  LoanDraft,
  PaymentFrequency,
  ScheduleLineDraft,
  ScheduleTerms,
} from "./types.js";
import { domainErr } from "./types.js";

export type CreateLoanDraftResult = {
  loan: LoanDraft;
  schedule: ScheduleLineDraft[];
};

export type FinalizeApprovedLoanResult = {
  schedule: ScheduleLineDraft[];
  effective_annual_rate_bps: number;
  disbursement_date: string;
};

type LoanTermsSource = {
  principal: number;
  origination_fee: number;
  term_periods: number;
  first_payment_date: string;
  annual_rate_bps: number;
  day_count_convention: DayCountConvention;
  payment_frequency: PaymentFrequency;
  amortization_type: ScheduleTerms["amortization_type"];
  grace_period_type: ScheduleTerms["grace_period_type"];
  grace_period_days: number | null;
  maturity_date: string;
};

function buildScheduleTerms(
  source: LoanTermsSource,
  accrualStartDate: string
): ScheduleTerms {
  return {
    principal: source.principal,
    term_periods: source.term_periods,
    first_payment_date: source.first_payment_date,
    accrual_start_date: accrualStartDate,
    annual_rate_bps: source.annual_rate_bps,
    day_count_convention: source.day_count_convention,
    payment_frequency: source.payment_frequency,
    amortization_type: source.amortization_type,
    grace_period_type: source.grace_period_type,
    grace_period_days: source.grace_period_days,
  };
}

function buildScheduleWithEir(
  source: LoanTermsSource,
  accrualStartDate: string
): { schedule: ScheduleLineDraft[]; effective_annual_rate_bps: number } {
  const net_disbursement = source.principal - source.origination_fee;
  const terms = buildScheduleTerms(source, accrualStartDate);
  const schedule = buildExpectedCashFlow(terms);
  const accrualWindows = buildScheduleAccrualWindows(terms);
  const opening = computeOpeningCarryingAmount({ net_disbursement });
  const effective_annual_rate_bps =
    source.origination_fee === 0
      ? source.annual_rate_bps
      : computeEffectiveAnnualRateBps({
          opening_carrying_amount: opening,
          schedule,
          payment_frequency: source.payment_frequency,
          day_count_convention: source.day_count_convention,
          accrual_start_date: accrualStartDate,
        });
  const scheduleWithEir = applyEirAmortization({
    schedule,
    opening_carrying_amount: opening,
    origination_fee: source.origination_fee,
    effective_annual_rate_bps,
    payment_frequency: source.payment_frequency,
    day_count_convention: source.day_count_convention,
    accrual_windows: accrualWindows,
  });
  const scheduleWithStatus = scheduleWithEir.map((line) => ({
    ...line,
    status: "scheduled" as const,
  }));

  return { schedule: scheduleWithStatus, effective_annual_rate_bps };
}

export function createLoanDraft(
  product: LoanProductForValidation | null,
  input: CreateLoanInput,
  now: Date
): DomainResult<CreateLoanDraftResult> {
  const validation = validate(product, input, now);
  if (!validation.ok) return validation;

  const { net_disbursement } = validation.value;
  const maturity_date = computeMaturityDate(
    input.first_payment_date,
    input.term_periods,
    product!.payment_frequency
  );
  if (!maturity_date) {
    return domainErr("We couldn't calculate the maturity date from the term and payment schedule.");
  }

  const source: LoanTermsSource = {
    principal: input.principal,
    origination_fee: input.origination_fee,
    term_periods: input.term_periods,
    first_payment_date: input.first_payment_date,
    annual_rate_bps: product!.annual_rate_bps,
    day_count_convention: product!.day_count_convention,
    payment_frequency: product!.payment_frequency,
    amortization_type: product!.amortization_type,
    grace_period_type: product!.grace_period_type,
    grace_period_days: product!.grace_period_days,
    maturity_date,
  };

  let scheduleResult: ReturnType<typeof buildScheduleWithEir>;
  try {
    scheduleResult = buildScheduleWithEir(source, todayDateOnlyUtc(now));
  } catch (err) {
    if (err instanceof RangeError) return domainErr(err.message);
    throw err;
  }
  const { schedule, effective_annual_rate_bps } = scheduleResult;

  const scheduleValidation = validateScheduleDraft(schedule);
  if (!scheduleValidation.ok) return scheduleValidation;

  const loan: LoanDraft = {
    blnk_identity_id: input.blnk_identity_id.trim(),
    loan_product_id: input.loan_product_id,
    principal: input.principal,
    origination_fee: input.origination_fee,
    net_disbursement,
    term_periods: input.term_periods,
    first_payment_date: input.first_payment_date,
    annual_rate_bps: product!.annual_rate_bps,
    day_count_convention: product!.day_count_convention,
    payment_frequency: product!.payment_frequency,
    amortization_type: product!.amortization_type,
    grace_period_type: product!.grace_period_type,
    grace_period_days: product!.grace_period_days,
    maturity_date,
    effective_annual_rate_bps,
    disbursement_date: null,
    status: "pending_approval",
    decided_at: null,
    decision_note: null,
  };

  return { ok: true, value: { loan, schedule } };
}

export function finalizeApprovedLoan(
  source: LoanTermsSource,
  disbursementDate: string
): DomainResult<FinalizeApprovedLoanResult> {
  if (disbursementDate > source.first_payment_date) {
    return domainErr(
      "The first payment date must be on or after the approval date."
    );
  }

  let scheduleResult: ReturnType<typeof buildScheduleWithEir>;
  try {
    scheduleResult = buildScheduleWithEir(source, disbursementDate);
  } catch (err) {
    if (err instanceof RangeError) return domainErr(err.message);
    throw err;
  }
  const { schedule, effective_annual_rate_bps } = scheduleResult;

  const scheduleValidation = validateScheduleDraft(schedule);
  if (!scheduleValidation.ok) return scheduleValidation;

  return {
    ok: true,
    value: {
      schedule,
      effective_annual_rate_bps,
      disbursement_date: disbursementDate,
    },
  };
}
