import { log } from "./utils.ts";
import { simulateOnboarding } from "./populateDemoOnboarding.ts";
import { simulateTransactions } from "./populateDemoTransactions.ts";

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
 * This orchestrates two phases:
 * - create identities + balances (optional)
 * - create transactions (always)
 */
export async function populate(
  ledgerName: string,
  identitiesCount: number,
  balancesPerIdentity: string[],
  transactionCount: number,
  amountMin: number,
  amountMax: number,
  useInternalBalances: boolean
): Promise<PopulateResult> {
  try {
    log("Starting Blnk instance population...", "info");

    /**
     * NOTE: This demo uses a hardcoded general ledger ID.
     * If your environment uses a different ledger setup, adjust accordingly.
     */
    const ledgerId = "general_ledger_id";
    log(`Using General Ledger: ${ledgerId}`, "info");

    let onboardingResult;
    let balances: Array<{ id: string; currency: string }> = [];

    if (useInternalBalances) {
      log("\nPhase 1: Skipping onboarding...", "info");
      log("Using internal balances - will generate unique balance IDs per transaction", "info");

      onboardingResult = { balances, errors: [] };
      log(`Skipped balance creation - will use internal balances for transactions`, "success");
    } else {
      log("\nPhase 1: Onboarding simulation...", "info");
      onboardingResult = await simulateOnboarding(ledgerId, identitiesCount, balancesPerIdentity);
      balances = onboardingResult.balances;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    log("Starting next phase...", "info");

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

