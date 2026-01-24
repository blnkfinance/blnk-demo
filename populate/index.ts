import { populate } from "@resources/populateDemo.ts";
import { log } from "@resources/utils.ts";

/**
 * Demo configuration.
 *
 * These knobs let you change the shape of the seeded dataset without editing code.
 */
const ledgerName = process.env.POPULATE_LEDGER_NAME || "Populate Demo Ledger";
const identitiesCount = parseInt(process.env.POPULATE_IDENTITIES_COUNT || "10", 10);
const balancesPerIdentityStr = process.env.POPULATE_BALANCES_PER_IDENTITY || "USD,EUR";
const transactionCount = parseInt(process.env.POPULATE_TRANSACTION_COUNT || "100", 10);
const amountMin = parseInt(process.env.POPULATE_AMOUNT_MIN || "100", 10);
const amountMax = parseInt(process.env.POPULATE_AMOUNT_MAX || "50000", 10);
const useInternalBalances = process.env.POPULATE_USE_INTERNAL_BALANCES === "true";

/** Parse currencies into a clean list. */
const balancesPerIdentity = balancesPerIdentityStr.split(",").map((c) => c.trim()).filter((c) => c.length > 0);

async function main() {
    try {
        /** Validate config early so failures are obvious and actionable. */

        if (identitiesCount <= 0 && !useInternalBalances) {
            throw new Error("POPULATE_IDENTITIES_COUNT must be greater than 0");
        }

        if (balancesPerIdentity.length === 0) {
            throw new Error("POPULATE_BALANCES_PER_IDENTITY must contain at least one currency");
        }

        if (transactionCount <= 0) {
            throw new Error("POPULATE_TRANSACTION_COUNT must be greater than 0");
        }

        if (amountMin <= 0 || amountMax <= amountMin) {
            throw new Error("POPULATE_AMOUNT_MIN must be greater than 0 and less than POPULATE_AMOUNT_MAX");
        }

        /**
         * Run the simulation.
         *
         * The heavy lifting lives in `resources/` so other demos can reuse the same
         * data-shaping utilities without duplicating logic.
         */
        const result = await populate(
            ledgerName,
            identitiesCount,
            balancesPerIdentity,
            transactionCount,
            amountMin,
            amountMax,
            useInternalBalances
        );

        if (result.success) {
            process.exit(0);
        } else {
            log(`\nUnexpected error: ${result.error}`, "error");
            process.exit(1);
        }
    } catch (error: any) {
        log(`\nError: ${error.message}`, "error");
        if (error.response) {
            log(`API Error: ${JSON.stringify(error.response.data, null, 2)}`, "error");
        }
        process.exit(1);
    }
}

main();
