import { log } from "./utils.ts";
import { simulateOnboarding } from "./populateDemoOnboarding.ts";
import { simulateTransactions } from "./populateDemoTransactions.ts";

/**
 * Populate demo orchestrator.
 *
 * This module is intentionally “thin”: it stitches together the onboarding phase
 * (optional) and the transaction seeding phase (always).
 *
 * The goal is to make the populate demo read like a checklist:
 * - Phase 1: Create identities + balances (or skip in internal balance mode)
 * - Phase 2: Create lots of transactions (batched via bulk endpoint)
 */
interface PopulateResult {
  success: boolean;
  onboarding?: any;
  transactions?: any;
  summary?: {
    useInternalBalances: boolean;
    identitiesProcessed: number;
    balancesCreated: number;
    transactionsCreated: number;
    totalOperations: number;
  };
  error?: string;
}

/**
 * Populate a Blnk instance with demo data.
 *
 * @param identitiesCount How many identities to create during onboarding.
 * @param balancesPerIdentity Which currencies to create per identity.
 * @param transactionCount How many transactions to generate.
 * @param amountMin Minimum generated amount (paired with `precision: 100`).
 * @param amountMax Maximum generated amount (paired with `precision: 100`).
 * @param useInternalBalances If true, skip onboarding and generate `@...` balance IDs
 * per transaction (fast seeding; no real balances).
 */
export async function populate(
  identitiesCount: number,
  balancesPerIdentity: string[],
  transactionCount: number,
  amountMin: number,
  amountMax: number,
  useInternalBalances: boolean
): Promise<PopulateResult> {
  try {
    log("Starting Blnk instance population...", "info");

    let onboardingResult;
    let balances: Array<{ id: string; currency: string }> = [];

    if (useInternalBalances) {
      /**
       * Phase 1 (optional): Onboarding.
       *
       * In internal balance mode we intentionally avoid creating identities/balances,
       * so you can quickly generate a large transaction dataset in an empty environment.
       */
      log("\nPhase 1: Skipping onboarding...", "info");
      log("Using internal balances - will generate unique balance IDs per transaction", "info");

      onboardingResult = { balances, errors: [] };
      log(`Skipped balance creation - will use internal balances for transactions`, "success");
    } else {
      /**
       * Phase 1: Onboarding.
       *
       * We create:
       * - One ledger per currency (so balances are cleanly separated by currency)
       * - Identities (customers)
       * - Balances for each identity in each currency
       */
      log("\nPhase 1: Onboarding simulation...", "info");
      onboardingResult = await simulateOnboarding(identitiesCount, balancesPerIdentity);
      balances = onboardingResult.balances;
    }

    // Give the system a tiny breather before bulk transaction ingestion.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    log("Starting next phase...", "info");

    /**
     * Phase 2: Transactions.
     *
     * We generate a mix of:
     * - Deposits: World -> Customer
     * - Withdrawals: Customer -> World
     * - Inter: Customer -> Customer (same currency only)
     *
     * Then we post them in batches via `/transactions/bulk`.
     */
    log("\nPhase 2: Transaction simulation...", "info");
    const transactionResult = await simulateTransactions(
      balances,
      transactionCount,
      amountMin,
      amountMax,
      useInternalBalances
    );

    log(`\nBlnk instance population completed successfully!`, "success");
    if (useInternalBalances) {
      log(
        `Summary: ${transactionResult.transactions.length} transactions created (using unique internal balance IDs per transaction)`,
        "info"
      );
    } else {
      log(
        `Summary: ${onboardingResult.balances.length} balances, ${transactionResult.transactions.length} transactions created`,
        "info"
      );
    }
    log(`Date range: ${transactionResult.dateRange.start} to ${transactionResult.dateRange.end}`, "info");

    return {
      success: true,
      onboarding: onboardingResult,
      transactions: transactionResult,
      summary: {
        useInternalBalances,
        identitiesProcessed: useInternalBalances ? 0 : identitiesCount,
        balancesCreated: onboardingResult.balances.length,
        transactionsCreated: transactionResult.transactions.length,
        totalOperations: onboardingResult.balances.length + transactionResult.transactions.length,
      },
    };
  } catch (error: any) {
    log(`Population failed: ${error.message}`, "error");
    return { success: false, error: error.message };
  }
}

