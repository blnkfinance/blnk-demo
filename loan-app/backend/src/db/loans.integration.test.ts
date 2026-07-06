import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import {
  goldenInput,
  goldenNow,
  goldenProduct,
} from "../domain/loans/fixtures/golden-100k-12mo.js";
import { createLoanDraft } from "../domain/loans/compose.js";
import {
  findLoanById,
  findScheduleByLoanId,
  findRepaymentsByLoanId,
  getDb,
  insertActiveInstall,
  insertLoanProduct,
  insertLoanWithSchedule,
  insertLoanRepaymentAndMarkPaid,
  resetDbForTests,
  approveLoanWithFinalizedSchedule,
  setLoanBlnkTransaction,
  markScheduleLineInterestAccrualSimulated,
  setScheduleLinePaid,
  setScheduleLineDue,
} from "./index.js";
import { finalizeApprovedLoan } from "../domain/loans/compose.js";
import { resetEnvForTests } from "../lib/env.js";

const TEST_ENCRYPTION_KEY = "a".repeat(64);
const TEST_INSTALLED_APP_ID = "inst_loan_test";
let tempDir: string;

function setupTestEnv(): void {
  resetDbForTests();
  resetEnvForTests();
  tempDir = mkdtempSync(path.join(tmpdir(), "loan-app-test-"));
  process.env.BACKEND_PUBLIC_URL = "http://localhost:4721";
  process.env.ENCRYPTION_KEY_HEX = TEST_ENCRYPTION_KEY;
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = path.join(tempDir, "test.db");
  getDb();

  insertActiveInstall({
    installed_app_id: TEST_INSTALLED_APP_ID,
    app_id: "app_test",
    instance_id: "instance_test",
    api_key_encrypted: "test_encrypted",
    api_key_prefix: "prefix",
    granted_permissions: ["data:read"],
    status: "active",
    idempotency_key: "install:loan-test",
  });
}

describe("insertLoanWithSchedule integration", () => {
  before(() => {
    setupTestEnv();
    insertLoanProduct({
      name: "Golden Product",
      interest_type: "fixed",
      annual_rate_bps: goldenProduct.annual_rate_bps,
      day_count_convention: goldenProduct.day_count_convention,
      payment_frequency: goldenProduct.payment_frequency,
      amortization_type: goldenProduct.amortization_type,
      grace_period_type: goldenProduct.grace_period_type,
      grace_period_days: goldenProduct.grace_period_days,
    });
  });

  after(() => {
    resetDbForTests();
    resetEnvForTests();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it("persists loan and schedule rows atomically", () => {
    const productId = getDb()
      .prepare(`SELECT loan_product_id FROM loan_products LIMIT 1`)
      .get() as { loan_product_id: string };

    const input = {
      ...goldenInput,
      loan_product_id: productId.loan_product_id,
    };
    const draft = createLoanDraft(
      { ...goldenProduct, loan_product_id: productId.loan_product_id },
      input,
      goldenNow
    );
    assert.equal(draft.ok, true);
    if (!draft.ok) return;

    const loan = insertLoanWithSchedule(
      TEST_INSTALLED_APP_ID,
      { ...draft.value.loan, blnk_transaction: null },
      draft.value.schedule
    );
    const persisted = findLoanById(loan.loan_id);
    const schedule = findScheduleByLoanId(loan.loan_id);

    assert.ok(persisted);
    assert.equal(persisted!.installed_app_id, TEST_INSTALLED_APP_ID);
    assert.equal(schedule.length, draft.value.schedule.length);
    for (const line of schedule) {
      assert.equal(line.status, "scheduled");
      assert.equal(line.interest_blnk_transaction, null);
    }
    assert.equal(persisted!.effective_annual_rate_bps, draft.value.loan.effective_annual_rate_bps);
    assert.equal(persisted!.blnk_transaction, null);
    assert.equal(
      schedule.reduce((s, l) => s + l.fee_income, 0),
      persisted!.origination_fee
    );

    const attached = setLoanBlnkTransaction(
      TEST_INSTALLED_APP_ID,
      loan.loan_id,
      "txn_attached_after_insert"
    );
    assert.ok(attached);
    assert.equal(attached!.blnk_transaction, "txn_attached_after_insert");
  });

  it("marks interest accrual simulated once per schedule line", () => {
    const productId = getDb()
      .prepare(`SELECT loan_product_id FROM loan_products LIMIT 1`)
      .get() as { loan_product_id: string };

    const draft = createLoanDraft(
      { ...goldenProduct, loan_product_id: productId.loan_product_id },
      { ...goldenInput, loan_product_id: productId.loan_product_id },
      goldenNow
    );
    assert.equal(draft.ok, true);
    if (!draft.ok) return;

    const loan = insertLoanWithSchedule(
      TEST_INSTALLED_APP_ID,
      { ...draft.value.loan, blnk_transaction: null },
      draft.value.schedule
    );
    const line = findScheduleByLoanId(loan.loan_id)[0]!;

    const first = markScheduleLineInterestAccrualSimulated(
      loan.loan_id,
      line.loan_schedule_id
    );
    assert.equal(first?.interest_blnk_transaction, line.loan_schedule_id);

    const duplicate = markScheduleLineInterestAccrualSimulated(
      loan.loan_id,
      line.loan_schedule_id
    );
    assert.equal(duplicate, undefined);
    assert.equal(
      findScheduleByLoanId(loan.loan_id)[0]!.interest_blnk_transaction,
      line.loan_schedule_id
    );
  });

  it("finalizes schedule in place on approve and preserves loan_schedule_id per period", () => {
    const productId = getDb()
      .prepare(`SELECT loan_product_id FROM loan_products LIMIT 1`)
      .get() as { loan_product_id: string };

    const input = {
      ...goldenInput,
      loan_product_id: productId.loan_product_id,
    };
    const draft = createLoanDraft(
      { ...goldenProduct, loan_product_id: productId.loan_product_id },
      input,
      goldenNow
    );
    assert.equal(draft.ok, true);
    if (!draft.ok) return;

    const loan = insertLoanWithSchedule(
      TEST_INSTALLED_APP_ID,
      { ...draft.value.loan, blnk_transaction: null },
      draft.value.schedule
    );
    const pendingSchedule = findScheduleByLoanId(loan.loan_id);
    const scheduleIdsByPeriod = new Map(
      pendingSchedule.map((line) => [line.period, line.loan_schedule_id])
    );
    const pendingFirstInterest = pendingSchedule[0]!.interest;

    const finalized = finalizeApprovedLoan(
      {
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
      },
      "2025-06-15"
    );
    assert.equal(finalized.ok, true);
    if (!finalized.ok) return;

    const approved = approveLoanWithFinalizedSchedule(
      loan.loan_id,
      finalized.value.schedule,
      finalized.value.effective_annual_rate_bps,
      finalized.value.disbursement_date
    );
    assert.ok(approved);
    assert.equal(approved!.status, "approved");
    assert.equal(approved!.disbursement_date, "2025-06-15");

    const approvedSchedule = findScheduleByLoanId(loan.loan_id);
    assert.equal(approvedSchedule.length, pendingSchedule.length);
    for (const line of approvedSchedule) {
      assert.equal(line.loan_schedule_id, scheduleIdsByPeriod.get(line.period));
      assert.equal(line.status, "scheduled");
    }
    assert.notEqual(approvedSchedule[0]!.interest, pendingFirstInterest);
    assert.equal(
      approvedSchedule[0]!.interest,
      finalized.value.schedule[0]!.interest
    );

    const firstLineId = scheduleIdsByPeriod.get(1)!;
    const paid = setScheduleLinePaid(loan.loan_id, firstLineId);
    assert.ok(paid);
    assert.equal(paid!.status, "paid");
  });

  it("marks a scheduled installment due", () => {
    const productId = getDb()
      .prepare(`SELECT loan_product_id FROM loan_products LIMIT 1`)
      .get() as { loan_product_id: string };

    const draft = createLoanDraft(
      { ...goldenProduct, loan_product_id: productId.loan_product_id },
      { ...goldenInput, loan_product_id: productId.loan_product_id },
      goldenNow
    );
    assert.equal(draft.ok, true);
    if (!draft.ok) return;

    const loan = insertLoanWithSchedule(
      TEST_INSTALLED_APP_ID,
      { ...draft.value.loan, blnk_transaction: null },
      draft.value.schedule
    );
    const firstLine = findScheduleByLoanId(loan.loan_id)[0]!;

    const due = setScheduleLineDue(loan.loan_id, firstLine.loan_schedule_id);
    assert.ok(due);
    assert.equal(due!.status, "due");

    const duplicate = setScheduleLineDue(loan.loan_id, firstLine.loan_schedule_id);
    assert.equal(duplicate, undefined);
  });

  it("lists repayments joined with schedule lines by period", () => {
    const productId = getDb()
      .prepare(`SELECT loan_product_id FROM loan_products LIMIT 1`)
      .get() as { loan_product_id: string };

    const draft = createLoanDraft(
      { ...goldenProduct, loan_product_id: productId.loan_product_id },
      { ...goldenInput, loan_product_id: productId.loan_product_id },
      goldenNow
    );
    assert.equal(draft.ok, true);
    if (!draft.ok) return;

    const loan = insertLoanWithSchedule(
      TEST_INSTALLED_APP_ID,
      { ...draft.value.loan, blnk_transaction: null },
      draft.value.schedule
    );
    const [firstLine, secondLine] = findScheduleByLoanId(loan.loan_id);

    insertLoanRepaymentAndMarkPaid({
      loan_repayment_id: "rep_period_2",
      loan_id: loan.loan_id,
      loan_schedule_id: secondLine!.loan_schedule_id,
      total_amount_paid: secondLine!.expected_payment,
    });
    insertLoanRepaymentAndMarkPaid({
      loan_repayment_id: "rep_period_1",
      loan_id: loan.loan_id,
      loan_schedule_id: firstLine!.loan_schedule_id,
      total_amount_paid: firstLine!.expected_payment,
    });

    const repayments = findRepaymentsByLoanId(loan.loan_id);
    assert.equal(repayments.length, 2);
    assert.deepEqual(
      repayments.map((row) => row.period),
      [1, 2]
    );
    assert.equal(repayments[0]!.total_amount_paid, firstLine!.expected_payment);
    assert.equal(repayments[1]!.payment_date, secondLine!.payment_date);
  });

  it("persists blnk_transaction when provided at insert", () => {
    const productId = getDb()
      .prepare(`SELECT loan_product_id FROM loan_products LIMIT 1`)
      .get() as { loan_product_id: string };

    const input = {
      ...goldenInput,
      loan_product_id: productId.loan_product_id,
    };
    const draft = createLoanDraft(
      { ...goldenProduct, loan_product_id: productId.loan_product_id },
      input,
      goldenNow
    );
    assert.equal(draft.ok, true);
    if (!draft.ok) return;

    const loan = insertLoanWithSchedule(
      TEST_INSTALLED_APP_ID,
      { ...draft.value.loan, blnk_transaction: "txn_queued_parent" },
      draft.value.schedule,
      { loanId: "loan_blnk_test" }
    );

    assert.equal(loan.loan_id, "loan_blnk_test");
    assert.equal(loan.blnk_transaction, "txn_queued_parent");
  });
});
