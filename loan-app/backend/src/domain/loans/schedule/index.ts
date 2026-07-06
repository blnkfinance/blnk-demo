/**
 * Contractual schedule builder — gross principal at contract rate.
 *
 * Actual/360 and Actual/365: interest per period from calendar days in each accrual window.
 * 30/360: nominal periodic rate (annual_bps / periods_per_year) — synthetic 30/360 deferred.
 *
 * Output rows have principal, interest, expected_payment, closing_principal filled.
 * EIR fields are zero until applyEirAmortization.
 */
import type { ScheduleLineDraft, ScheduleTerms } from "../types.js";
import { buildBulletSchedule } from "./bullet.js";
import { buildEqualInstallmentsSchedule } from "./equal-installments.js";
import { buildEqualPrincipalSchedule } from "./equal-principal.js";
import { applyGracePeriod } from "./grace.js";

export function buildExpectedCashFlow(terms: ScheduleTerms): ScheduleLineDraft[] {
  let lines: ScheduleLineDraft[];
  switch (terms.amortization_type) {
    case "equal_installments":
      lines = buildEqualInstallmentsSchedule(terms);
      break;
    case "equal_principal":
      lines = buildEqualPrincipalSchedule(terms);
      break;
    case "bullet":
      lines = buildBulletSchedule(terms);
      break;
  }

  return applyGracePeriod(lines, terms);
}
