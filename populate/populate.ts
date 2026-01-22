import { log } from "@resources/utils.ts";
import { ensureLedger } from "./helpers.ts";
import { simulateOnboarding } from "./onboarding.ts";
import { simulateTransactions } from "./transactions.ts";

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
 * Main function to populate a Blnk instance with test data
 * Orchestrates the complete flow: ledger setup → onboarding → transactions
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

        // Ensure ledger exists (search by name, create if not found)
        log("\nPhase 0: Ensuring ledger exists...", "info");
        const ledgerId = await ensureLedger(ledgerName);

        let onboardingResult;
        let balances: Array<{ id: string; currency: string }> = [];

        if (useInternalBalances) {
            // Skip onboarding - balances will be generated per transaction
            log("\nPhase 1: Skipping onboarding...", "info");
            log("Using internal balances - will generate unique balance IDs per transaction", "info");

            onboardingResult = {
                balances: balances,
                errors: [],
            };

            log(`Skipped balance creation - will use internal balances for transactions`, "success");
        } else {
            // Phase 1: Onboarding (Create identities and balances)
            log("\nPhase 1: Onboarding simulation...", "info");
            onboardingResult = await simulateOnboarding(ledgerId, identitiesCount, balancesPerIdentity);
            balances = onboardingResult.balances;
        }

        // 2 second delay between phases
        await new Promise((resolve) => setTimeout(resolve, 2000));
        log("Starting next phase...", "info");

        // Phase 2: Transactions (Create transactions between balances)
        log("\nPhase 2: Transaction simulation...", "info");
        const transactionResult = await simulateTransactions(
            balances,
            transactionCount,
            amountMin,
            amountMax,
            useInternalBalances
        );

        // Final Summary
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
                useInternalBalances: useInternalBalances,
                identitiesProcessed: useInternalBalances ? 0 : identitiesCount,
                balancesCreated: onboardingResult.balances.length,
                transactionsCreated: transactionResult.transactions.length,
                totalOperations: onboardingResult.balances.length + transactionResult.transactions.length,
            },
        };
    } catch (error: any) {
        log(`Population failed: ${error.message}`, "error");

        return {
            success: false,
            error: error.message,
        };
    }
}
