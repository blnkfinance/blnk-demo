/**
 * HTTP handlers for loan applications.
 *
 * Wiring pattern (same as products):
 *   Zod schema → domain logic → DB accessor → JSON response
 *
 * Create flow:
 *   POST /loans → createLoanDraft (pure) → insertLoanWithSchedule → Omni balances + inflight
 *
 * Approve/reject commit or void the inflight disbursement, then update loan status.
 * Deal terms are frozen at creation; schedule payment status may be marked paid.
 */
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { createLoanDraft, finalizeApprovedLoan } from "../domain/loans/compose.js";
import {
  approveLoan as approveLoanGuard,
  rejectLoan as rejectLoanGuard,
} from "../domain/loans/lifecycle.js";
import { markScheduleLineDue, markScheduleLinePaid } from "../domain/loans/schedule-lifecycle.js";
import { buildDailyInterestAmounts } from "../domain/loans/daily-interest.js";
import {
  findLoanForInstall,
  findLoanProductById,
  findLoanRepaymentByScheduleLine,
  findRepaymentsByLoanId,
  findScheduleByLoanId,
  findScheduleLineById,
  getLoanEligibilitySettings,
  insertLoanRepaymentAndMarkPaid,
  insertLoanWithSchedule,
  listLoans,
  approveLoanWithFinalizedSchedule,
  setLoanBlnkTransaction,
  markScheduleLineInterestAccrualSimulated,
  setLoanRejected,
  setScheduleLineDue,
} from "../db/index.js";
import {
  domainValidationResponse,
  LOAN_CREATE_FIELD_MAP,
  sendValidationError,
  validationError,
  zodValidationResponse,
} from "../lib/apiError.js";
import { getIdentityById } from "../lib/blnk/identities.js";
import { createLoanBalances } from "../lib/blnk/loanBalances.js";
import {
  checkIdentityLoanEligibility,
  LOAN_ELIGIBILITY_INELIGIBLE_MESSAGE,
} from "../lib/blnk/loanEligibility.js";
import {
  commitInflightTransaction,
  createDisbursementInflight,
  resolveDisbursementBalance,
  voidInflightTransaction,
} from "../lib/blnk/loanDisbursement.js";
import { simulateInterestAccrualForScheduleLine } from "../lib/blnk/loanInterestAccrual.js";
import { buildLoanBalanceBreakdown } from "../lib/blnk/loanBalanceBreakdown.js";
import { listLoanLedgerTransactions } from "../lib/blnk/loanLedgerTransactions.js";
import {
  buildLoanRepaymentId,
  postLoanRepaymentBulk,
} from "../lib/blnk/loanRepayment.js";
import { logger, newRequestId } from "../lib/logger.js";
import {
  createLoanSchema,
  listLoansQuerySchema,
  loanLedgerTransactionsQuerySchema,
  rejectLoanSchema,
} from "../lib/schemas/loans.js";
import type { PortalAuthedRequest } from "../lib/requirePortalAuth.js";
import { todayDateOnlyUtc } from "../domain/loans/schedule/dates.js";
import type { LoanRow } from "../db/index.js";

function productInactiveError(): { status: number; error: string } {
  return {
    status: 409,
    error: "This product is no longer active. Choose an active product.",
  };
}

export async function listLoansHandler(
  req: PortalAuthedRequest,
  res: Response
): Promise<void> {
  const requestId = newRequestId();
  const install = req.portalAuth!.install;
  const parsed = listLoansQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendValidationError(res, zodValidationResponse(parsed.error));
    return;
  }

  const { status, limit, offset, include_customer } = parsed.data;
  const result = listLoans({
    installedAppId: install.installed_app_id,
    status,
    limit,
    offset,
  });

  const customerRequests = new Map<
    string,
    ReturnType<typeof getIdentityById>
  >();
  const loans = await Promise.all(
    result.loans.map(async (loan) => {
      if (!include_customer || !loan.blnk_identity_id) {
        return { ...loan, customer: null };
      }

      let request = customerRequests.get(loan.blnk_identity_id);
      if (!request) {
        request = getIdentityById(install, loan.blnk_identity_id);
        customerRequests.set(loan.blnk_identity_id, request);
      }

      try {
        return { ...loan, customer: await request };
      } catch (err) {
        logger.warn("loans.list.customer.error", {
          request_id: requestId,
          loan_id: loan.loan_id,
          blnk_identity_id: loan.blnk_identity_id,
          error: err instanceof Error ? err.message : "Failed to load customer",
        });
        return { ...loan, customer: null };
      }
    })
  );

  logger.info("loans.list.ok", {
    request_id: requestId,
    installed_app_id: install.installed_app_id,
    total: result.total,
    status,
  });

  res.status(200).json({
    loans,
    total: result.total,
    limit,
    offset,
  });
}

export async function getLoan(req: PortalAuthedRequest, res: Response): Promise<void> {
  const requestId = newRequestId();
  const loanId = req.params.loan_id;
  const install = req.portalAuth!.install;

  const loan = findLoanForInstall(install.installed_app_id, loanId);
  if (!loan) {
    res.status(404).json({ ok: false, error: "We couldn't find that loan." });
    return;
  }

  // Schedule is always read from loan_schedule rows, never recomputed.
  const schedule = findScheduleByLoanId(loanId);
  const repayments = findRepaymentsByLoanId(loanId);

  let customer = null;
  if (loan.blnk_identity_id) {
    try {
      customer = await getIdentityById(install, loan.blnk_identity_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load customer";
      logger.warn("loans.get.customer.error", {
        request_id: requestId,
        loan_id: loanId,
        blnk_identity_id: loan.blnk_identity_id,
        error: message,
      });
    }
  }

  let balance_breakdown = null;
  if (loan.status === "approved" && loan.blnk_identity_id) {
    try {
      balance_breakdown = await buildLoanBalanceBreakdown(install, loan, repayments);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load loan balance breakdown";
      logger.warn("loans.get.balance_breakdown.error", {
        request_id: requestId,
        loan_id: loanId,
        error: message,
      });
    }
  }

  logger.info("loans.get.ok", {
    request_id: requestId,
    loan_id: loanId,
  });

  res.status(200).json({ loan, schedule, repayments, balance_breakdown, customer });
}

export async function createLoan(req: PortalAuthedRequest, res: Response): Promise<void> {
  const requestId = newRequestId();
  const install = req.portalAuth!.install;
  const parsed = createLoanSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, zodValidationResponse(parsed.error));
    return;
  }

  const input = parsed.data;

  // Load product for snapshot fields and active-status gate (409 if archived).
  const productRow = findLoanProductById(input.loan_product_id);
  if (!productRow) {
    res.status(404).json({ ok: false, error: "We couldn't find that loan product." });
    return;
  }
  if (productRow.status !== "active") {
    const { status, error } = productInactiveError();
    res.status(status).json({ ok: false, error });
    return;
  }

  try {
    const eligibility = await checkIdentityLoanEligibility(
      install,
      input.blnk_identity_id
    );
    if (!eligibility.eligible) {
      sendValidationError(
        res,
        validationError(eligibility.message, {
          blnk_identity_id: LOAN_ELIGIBILITY_INELIGIBLE_MESSAGE,
        })
      );
      return;
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to verify customer eligibility";
    logger.warn("loans.create.eligibility.error", {
      request_id: requestId,
      blnk_identity_id: input.blnk_identity_id,
      error: message,
    });
    res.status(502).json({ ok: false, error: message });
    return;
  }

  const product = {
    loan_product_id: productRow.loan_product_id,
    annual_rate_bps: productRow.annual_rate_bps,
    day_count_convention: productRow.day_count_convention,
    payment_frequency: productRow.payment_frequency,
    amortization_type: productRow.amortization_type,
    grace_period_type: productRow.grace_period_type,
    grace_period_days: productRow.grace_period_days,
    status: productRow.status,
  };

  // Pure pipeline: validate → contractual schedule → EIR → fee-income split.
  const draft = createLoanDraft(product, input, new Date());
  if (!draft.ok) {
    if (draft.error === "This product is no longer active. Choose an active product.") {
      const { status, error } = productInactiveError();
      res.status(status).json({ ok: false, error });
      return;
    }
    sendValidationError(res, domainValidationResponse(draft.error, LOAN_CREATE_FIELD_MAP));
    return;
  }

  // Persist the local loan before creating any remote resources. The loan ID is
  // then the stable correlation key for Omni balances and the inflight transaction.
  const loanId = `loan_${randomUUID()}`;
  const persistedLoan = insertLoanWithSchedule(
    install.installed_app_id,
    { ...draft.value.loan, blnk_transaction: null },
    draft.value.schedule,
    { loanId }
  );

  const { allowed_books } = getLoanEligibilitySettings(install.installed_app_id);

  let blnkTransaction: string;
  try {
    const disbursement = await resolveDisbursementBalance(
      install,
      input.blnk_identity_id,
      allowed_books
    );
    const loanBalances = await createLoanBalances(install, {
      loanId,
      identityId: input.blnk_identity_id,
      currency: disbursement.currency,
    });
    blnkTransaction = await createDisbursementInflight(install, {
      currency: disbursement.currency,
      loansReceivableBalanceId: loanBalances.loansReceivableBalanceId,
      deferredFeeBalanceId: loanBalances.deferredFeeBalanceId,
      disbursementBalanceId: disbursement.balanceId,
      loan: {
        loanId,
        loanProductId: draft.value.loan.loan_product_id,
        principal: draft.value.loan.principal,
        originationFee: draft.value.loan.origination_fee,
        netDisbursement: draft.value.loan.net_disbursement,
        termPeriods: draft.value.loan.term_periods,
        firstPaymentDate: draft.value.loan.first_payment_date,
        annualRateBps: draft.value.loan.annual_rate_bps,
        effectiveAnnualRateBps: draft.value.loan.effective_annual_rate_bps,
        paymentFrequency: draft.value.loan.payment_frequency,
        amortizationType: draft.value.loan.amortization_type,
        disbursementBook: disbursement.book,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to record loan disbursement in Omni";
    logger.warn("loans.create.blnk.error", {
      request_id: requestId,
      loan_id: loanId,
      blnk_identity_id: input.blnk_identity_id,
      error: message,
    });
    res.status(502).json({ ok: false, error: message });
    return;
  }

  const loan = setLoanBlnkTransaction(
    install.installed_app_id,
    persistedLoan.loan_id,
    blnkTransaction
  );
  if (!loan) {
    logger.error("loans.create.blnk_transaction.persist_error", {
      request_id: requestId,
      loan_id: persistedLoan.loan_id,
      blnk_transaction: blnkTransaction,
    });
    res.status(500).json({
      ok: false,
      error: "The loan was created, but its Omni transaction could not be attached.",
    });
    return;
  }

  const schedule = findScheduleByLoanId(loan.loan_id);

  logger.info("loans.create.ok", {
    request_id: requestId,
    loan_id: loan.loan_id,
  });

  res.status(201).json({ loan, schedule });
}

function loanTermsFromRow(loan: LoanRow) {
  return {
    principal: loan.principal,
    origination_fee: loan.origination_fee,
    term_periods: loan.term_periods,
    first_payment_date: loan.first_payment_date,
    annual_rate_bps: loan.annual_rate_bps,
    day_count_convention: loan.day_count_convention,
    payment_frequency: loan.payment_frequency,
    amortization_type: loan.amortization_type,
    grace_period_type: loan.grace_period_type,
    grace_period_days: loan.grace_period_days,
    maturity_date: loan.maturity_date,
  };
}

export async function approveLoan(req: PortalAuthedRequest, res: Response): Promise<void> {
  const requestId = newRequestId();
  const install = req.portalAuth!.install;
  const loanId = req.params.loan_id;

  const existing = findLoanForInstall(install.installed_app_id, loanId);
  if (!existing) {
    res.status(404).json({ ok: false, error: "We couldn't find that loan." });
    return;
  }

  const guard = approveLoanGuard(existing.status);
  if (!guard.ok) {
    res.status(409).json({ ok: false, error: guard.error });
    return;
  }

  if (!existing.blnk_transaction) {
    res.status(409).json({
      ok: false,
      error: "This loan has no Omni disbursement to commit.",
    });
    return;
  }

  const disbursementDate = todayDateOnlyUtc(new Date());
  const finalized = finalizeApprovedLoan(loanTermsFromRow(existing), disbursementDate);
  if (!finalized.ok) {
    res.status(409).json({ ok: false, error: finalized.error });
    return;
  }

  const loan = approveLoanWithFinalizedSchedule(
    loanId,
    finalized.value.schedule,
    finalized.value.effective_annual_rate_bps,
    finalized.value.disbursement_date
  );
  if (!loan) {
    res.status(409).json({ ok: false, error: "This loan can't be approved right now." });
    return;
  }

  try {
    await commitInflightTransaction(install, existing.blnk_transaction);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to commit loan disbursement in Omni";
    logger.warn("loans.approve.blnk.error", {
      request_id: requestId,
      loan_id: loanId,
      blnk_transaction: existing.blnk_transaction,
      error: message,
    });
    res.status(502).json({ ok: false, error: message });
    return;
  }

  const schedule = findScheduleByLoanId(loanId);

  logger.info("loans.approve.ok", {
    request_id: requestId,
    loan_id: loanId,
  });

  res.status(200).json({ loan, schedule });
}

export async function rejectLoan(req: PortalAuthedRequest, res: Response): Promise<void> {
  const requestId = newRequestId();
  const install = req.portalAuth!.install;
  const loanId = req.params.loan_id;

  const parsed = rejectLoanSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendValidationError(res, zodValidationResponse(parsed.error));
    return;
  }

  const existing = findLoanForInstall(install.installed_app_id, loanId);
  if (!existing) {
    res.status(404).json({ ok: false, error: "We couldn't find that loan." });
    return;
  }

  const guard = rejectLoanGuard(existing.status);
  if (!guard.ok) {
    res.status(409).json({ ok: false, error: guard.error });
    return;
  }

  if (!existing.blnk_transaction) {
    res.status(409).json({
      ok: false,
      error: "This loan has no Omni disbursement to void.",
    });
    return;
  }

  const decisionNote = parsed.data.decision_note ?? null;
  const loan = setLoanRejected(loanId, decisionNote);
  if (!loan) {
    res.status(409).json({ ok: false, error: "This loan can't be rejected right now." });
    return;
  }

  try {
    await voidInflightTransaction(install, existing.blnk_transaction);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to void loan disbursement in Omni";
    logger.warn("loans.reject.blnk.error", {
      request_id: requestId,
      loan_id: loanId,
      blnk_transaction: existing.blnk_transaction,
      error: message,
    });
    res.status(502).json({ ok: false, error: message });
    return;
  }

  logger.info("loans.reject.ok", {
    request_id: requestId,
    loan_id: loanId,
  });

  res.status(200).json({ loan });
}

export async function payScheduleLine(
  req: PortalAuthedRequest,
  res: Response
): Promise<void> {
  const requestId = newRequestId();
  const install = req.portalAuth!.install;
  const loanId = req.params.loan_id;
  const loanScheduleId = req.params.loan_schedule_id;

  const loan = findLoanForInstall(install.installed_app_id, loanId);
  if (!loan) {
    res.status(404).json({ ok: false, error: "We couldn't find that loan." });
    return;
  }

  const existing = findScheduleLineById(loanId, loanScheduleId);
  if (!existing) {
    res.status(404).json({ ok: false, error: "We couldn't find that installment." });
    return;
  }

  const guard = markScheduleLinePaid(loan.status, existing.status);
  if (!guard.ok) {
    res.status(409).json({ ok: false, error: guard.error });
    return;
  }

  if (findLoanRepaymentByScheduleLine(loanScheduleId)) {
    res.status(409).json({ ok: false, error: "This installment has already been repaid." });
    return;
  }

  if (!loan.blnk_identity_id) {
    res.status(409).json({ ok: false, error: "This loan has no linked customer identity." });
    return;
  }

  const { allowed_books } = getLoanEligibilitySettings(install.installed_app_id);
  const repaymentId = buildLoanRepaymentId(loanScheduleId);

  let totalAmountPaid: number;
  try {
    const repayment = await postLoanRepaymentBulk(install, {
      repaymentId,
      identityId: loan.blnk_identity_id,
      allowedBooks: allowed_books,
      scheduleLine: existing,
    });
    totalAmountPaid = repayment.totalAmountPaid;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to record loan repayment in Omni";
    logger.warn("loans.schedule.pay.blnk.error", {
      request_id: requestId,
      loan_id: loanId,
      loan_schedule_id: loanScheduleId,
      error: message,
    });
    res.status(502).json({ ok: false, error: message });
    return;
  }

  const persisted = insertLoanRepaymentAndMarkPaid({
    loan_repayment_id: repaymentId,
    loan_id: loanId,
    loan_schedule_id: loanScheduleId,
    total_amount_paid: totalAmountPaid,
  });

  if (!persisted) {
    logger.error("loans.schedule.pay.persist.error", {
      request_id: requestId,
      loan_id: loanId,
      loan_schedule_id: loanScheduleId,
      loan_repayment_id: repaymentId,
    });
    res.status(409).json({ ok: false, error: "This installment can't be marked paid right now." });
    return;
  }

  logger.info("loans.schedule.pay.ok", {
    request_id: requestId,
    loan_id: loanId,
    loan_schedule_id: loanScheduleId,
    loan_repayment_id: repaymentId,
  });

  res.status(200).json({
    line: persisted.line,
    repayment: persisted.repayment,
  });
}

export async function markScheduleLineDueHandler(
  req: PortalAuthedRequest,
  res: Response
): Promise<void> {
  const requestId = newRequestId();
  const install = req.portalAuth!.install;
  const loanId = req.params.loan_id;
  const loanScheduleId = req.params.loan_schedule_id;

  const loan = findLoanForInstall(install.installed_app_id, loanId);
  if (!loan) {
    res.status(404).json({ ok: false, error: "We couldn't find that loan." });
    return;
  }

  const existing = findScheduleLineById(loanId, loanScheduleId);
  if (!existing) {
    res.status(404).json({ ok: false, error: "We couldn't find that installment." });
    return;
  }

  const guard = markScheduleLineDue(loan.status, existing.status);
  if (!guard.ok) {
    res.status(409).json({ ok: false, error: guard.error });
    return;
  }

  const line = setScheduleLineDue(loanId, loanScheduleId);
  if (!line) {
    res.status(409).json({
      ok: false,
      error: "This installment can't be marked due.",
    });
    return;
  }

  logger.info("loans.schedule.mark_due.ok", {
    request_id: requestId,
    loan_id: loanId,
    loan_schedule_id: loanScheduleId,
  });

  res.status(200).json({ line });
}

export async function simulateInterestAccrual(
  req: PortalAuthedRequest,
  res: Response
): Promise<void> {
  const requestId = newRequestId();
  const install = req.portalAuth!.install;
  const loanId = req.params.loan_id;
  const loanScheduleId = req.params.loan_schedule_id;

  const loan = findLoanForInstall(install.installed_app_id, loanId);
  if (!loan) {
    res.status(404).json({ ok: false, error: "We couldn't find that loan." });
    return;
  }

  if (loan.status !== "approved") {
    res.status(409).json({ ok: false, error: "Only approved loans can simulate interest accrual." });
    return;
  }

  const existing = findScheduleLineById(loanId, loanScheduleId);
  if (!existing) {
    res.status(404).json({ ok: false, error: "We couldn't find that installment." });
    return;
  }

  if (existing.status === "void") {
    res.status(409).json({ ok: false, error: "This installment is void and can't accrue interest." });
    return;
  }

  if (existing.interest_blnk_transaction) {
    res.status(409).json({
      ok: false,
      error: "Interest accrual has already been simulated for this installment.",
    });
    return;
  }

  if (!loan.blnk_identity_id) {
    res.status(409).json({ ok: false, error: "This loan has no linked customer identity." });
    return;
  }

  if (!loan.disbursement_date) {
    res.status(409).json({ ok: false, error: "This loan has no disbursement date for accrual." });
    return;
  }

  if (existing.interest <= 0) {
    res.status(409).json({ ok: false, error: "No interest to accrue for this period." });
    return;
  }

  const dailyAmounts = buildDailyInterestAmounts({
    loan: {
      disbursement_date: loan.disbursement_date,
      first_payment_date: loan.first_payment_date,
      term_periods: loan.term_periods,
      annual_rate_bps: loan.annual_rate_bps,
      day_count_convention: loan.day_count_convention,
      payment_frequency: loan.payment_frequency,
      amortization_type: loan.amortization_type,
      grace_period_type: loan.grace_period_type,
      grace_period_days: loan.grace_period_days,
      principal: loan.principal,
    },
    line: {
      period: existing.period,
      interest: existing.interest,
      principal: existing.principal,
      closing_principal: existing.closing_principal,
    },
  });

  if (dailyAmounts.length === 0) {
    res.status(409).json({ ok: false, error: "No accrual days for this period." });
    return;
  }

  try {
    const result = await simulateInterestAccrualForScheduleLine(install, {
      identityId: loan.blnk_identity_id,
      loanId,
      scheduleLine: existing,
      dailyAmounts,
    });

    const persisted = markScheduleLineInterestAccrualSimulated(loanId, loanScheduleId);
    if (!persisted) {
      logger.warn("loans.schedule.simulate_interest.duplicate", {
        request_id: requestId,
        loan_id: loanId,
        loan_schedule_id: loanScheduleId,
      });
      res.status(409).json({
        ok: false,
        error: "Interest accrual has already been simulated for this installment.",
      });
      return;
    }

    logger.info("loans.schedule.simulate_interest.ok", {
      request_id: requestId,
      loan_id: loanId,
      loan_schedule_id: loanScheduleId,
      transaction_count: result.transactionCount,
    });

    res.status(200).json({
      transaction_count: result.transactionCount,
      total_interest: result.totalInterest,
      line: persisted,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to simulate interest accrual in Omni";
    logger.warn("loans.schedule.simulate_interest.blnk.error", {
      request_id: requestId,
      loan_id: loanId,
      loan_schedule_id: loanScheduleId,
      error: message,
    });
    res.status(502).json({ ok: false, error: message });
  }
}

export async function listLoanLedgerTransactionsHandler(
  req: PortalAuthedRequest,
  res: Response
): Promise<void> {
  const requestId = newRequestId();
  const loanId = req.params.loan_id;
  const install = req.portalAuth!.install;

  const parsed = loanLedgerTransactionsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendValidationError(res, zodValidationResponse(parsed.error));
    return;
  }

  const loan = findLoanForInstall(install.installed_app_id, loanId);
  if (!loan) {
    res.status(404).json({ ok: false, error: "We couldn't find that loan." });
    return;
  }

  if (loan.status !== "approved") {
    res.status(409).json({
      ok: false,
      error: "Ledger transactions are only available for approved loans.",
    });
    return;
  }

  const { kind, page, pageSize } = parsed.data;

  try {
    const result = await listLoanLedgerTransactions(
      install,
      loanId,
      kind,
      page,
      pageSize
    );

    logger.info("loans.ledger_transactions.ok", {
      request_id: requestId,
      loan_id: loanId,
      kind,
      total: result.total,
    });

    res.status(200).json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load ledger transactions";
    logger.warn("loans.ledger_transactions.error", {
      request_id: requestId,
      loan_id: loanId,
      kind,
      error: message,
    });
    res.status(502).json({ ok: false, error: message });
  }
}
