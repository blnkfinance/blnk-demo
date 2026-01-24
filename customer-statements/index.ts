import { exportCustomerStatementToCSV, exportCustomerStatementToPDF } from "@resources/customerStatementsExporters.ts";
import { blnk } from "@resources/utils.ts";
import { query } from "@resources/db.ts";
import type { Statement } from "@resources/customerStatements.ts";
import {
    formatAmount,
    formatTimestamp,
    getCurrencyPrecision,
    getDirection,
    toDisplayAmount,
} from "@resources/formatters.ts";

interface Transaction {
    effective_date: string;
    reference: string;
    description: string;
    source: string;
    destination: string;
    amount: string;
    currency: string;
    precision: number;
}

interface HistoricalBalance {
    balance_id: string;
    balance: number | string;
    credit_balance: number | string;
    debit_balance: number | string;
}

type StatementTransaction = Statement["transactions"][number];

/**
 * Generate a customer statement for a balance across a time window.
 *
 */
async function generateStatement(
    balanceId: string,
    currency: string,
    periodStart: string,
    periodEnd: string
): Promise<Statement> {
    /**
     * Step 1: Load the period’s transactions.
     *
     * Everything else (balances, totals, export rows) is derived from this
     * ordered slice of applied ledger activity.
     */
    const transactions = await queryTransactions(balanceId, currency, periodStart, periodEnd);

    if (transactions.length === 0) {
        throw new Error(
            `No transactions found for balance ${balanceId} in the specified period. ` +
            `If you have no transaction data, use the populate script first to create sample data.`
        );
    }

    /**
     * Step 2: Fetch the “context” we need to render a statement.
     *
     * - Account name: makes the statement human-readable.
     * - Start/end snapshots: gives us opening/closing balances that match Blnk’s ledger state.
     */
    const accountName = await fetchBalanceDisplayName(balanceId);
    const periodStartBalance = await fetchHistoricalBalance(balanceId, periodStart);
    const periodEndBalance = await fetchHistoricalBalance(balanceId, periodEnd);

    /**
     * Step 3: Convert snapshot values and compute totals.
     *
     * Credits/debits are cumulative fields, so we take the delta across the period.
     */
    const openingBalance = typeof periodStartBalance.balance === "string"
        ? parseFloat(periodStartBalance.balance)
        : periodStartBalance.balance;
    const closingBalance = typeof periodEndBalance.balance === "string"
        ? parseFloat(periodEndBalance.balance)
        : periodEndBalance.balance;

    const startCredit = typeof periodStartBalance.credit_balance === "string"
        ? parseFloat(periodStartBalance.credit_balance)
        : periodStartBalance.credit_balance;
    const endCredit = typeof periodEndBalance.credit_balance === "string"
        ? parseFloat(periodEndBalance.credit_balance)
        : periodEndBalance.credit_balance;
    const totalCredits = endCredit - startCredit;

    const startDebit = typeof periodStartBalance.debit_balance === "string"
        ? parseFloat(periodStartBalance.debit_balance)
        : periodStartBalance.debit_balance;
    const endDebit = typeof periodEndBalance.debit_balance === "string"
        ? parseFloat(periodEndBalance.debit_balance)
        : periodEndBalance.debit_balance;
    const totalDebits = endDebit - startDebit;

    /**
     * Step 4: Pick a single display precision for consistent formatting.
     *
     * This helps convert amounts into consistent decimal strings (based on the
     * currency/precision we observe in the dataset), and prevents mixed decimal
     * places across rows and totals.
     */
    const precision = getCurrencyPrecision(transactions, currency);

    /**
     * Step 5: Format transactions into export-ready rows.
     *
     * Exporters should not need to know about ledger semantics (direction,
     * counterparty, or how to label World deposits/withdrawals).
     */
    const formattedTransactions: StatementTransaction[] = [];
    for (const tx of transactions) {
        const direction = getDirection(tx, balanceId);
        const counterpartyId = getCounterpartyId(tx, balanceId);
        let counterparty = await fetchBalanceDisplayName(counterpartyId);

        if (counterparty.toLowerCase().includes("world")) {
            if (tx.source === counterpartyId) counterparty = "Deposit";
            else if (tx.destination === counterpartyId) counterparty = "Withdrawal";
        }

        formattedTransactions.push({
            timestamp: formatTimestamp(tx.effective_date),
            reference: tx.reference,
            description: tx.description,
            direction,
            counterparty,
            amount: formatAmount(tx.amount),
            currency: tx.currency,
        });
    }

    /** Step 6: Assemble the final statement object. */
    return {
        balance_id: balanceId,
        currency,
        account_name: accountName,
        period: { start: periodStart, end: periodEnd },
        opening_balance: toDisplayAmount(openingBalance, precision),
        closing_balance: toDisplayAmount(closingBalance, precision),
        totals: {
            credits: toDisplayAmount(totalCredits, precision),
            debits: toDisplayAmount(totalDebits, precision),
            transaction_count: transactions.length,
        },
        transactions: formattedTransactions,
    };
}

/**
 * Resolve a balance ID to a human-readable display name.
 */
async function fetchBalanceDisplayName(balanceId: string): Promise<string> {
    try {
        const response = await blnk.post("/search/balances", {
            q: balanceId,
            query_by: "balance_id",
            include_fields: "$identities(first_name,last_name)",
        });

        const hits = response.data?.hits || [];
        if (hits.length === 0) return balanceId;

        const balance = hits[0].document || hits[0];
        const identity = balance.identities;

        if (identity?.first_name && identity?.last_name) {
            return `${identity.first_name} ${identity.last_name}`;
        }

        return balance.indicator || balanceId;
    } catch (error) {
        console.warn(`Failed to fetch balance details for ${balanceId}:`, error);
        return balanceId;
    }
}

/**
 * Given a transaction and a focal balance, return the “other side”.
 *
 * Statements are balance-centric, so each row needs a counterparty.
 */
function getCounterpartyId(transaction: Transaction, balanceId: string): string {
    if (transaction.source === balanceId) return transaction.destination;
    if (transaction.destination === balanceId) return transaction.source;
    throw new Error(`Balance ID ${balanceId} is neither source nor destination in transaction`);
}

/**
 * Fetch the balance snapshot “at” a timestamp.
 *
 * This keeps opening/closing balances consistent with the ledger even when
 * transactions are posted retroactively.
 */
async function fetchHistoricalBalance(balanceId: string, timestamp: string): Promise<HistoricalBalance> {
    const response = await blnk.get(`/balances/${balanceId}/at?timestamp=${timestamp}`);
    const data = response.data;

    return {
        balance_id: data.balance.balance_id,
        balance: data.balance.balance,
        credit_balance: data.balance.credit_balance,
        debit_balance: data.balance.debit_balance,
    };
}

/**
 * Query applied transactions for this balance within the time window.
 *
 * Blnk uses Postgres as its database engine, so querying `blnk.transactions`
 * is querying Blnk’s underlying ledger data with efficient filtering and a
 * stable, time-ordered result set.
 */
async function queryTransactions(
    balanceId: string,
    currency: string,
    periodStart: string,
    periodEnd: string
): Promise<Transaction[]> {
    const result = await query<Transaction>(
        `SELECT 
            effective_date,
            reference,
            description,
            source,
            destination,
            amount,
            currency,
            precision
        FROM blnk.transactions
        WHERE status = 'APPLIED'
            AND currency = $1
            AND (source = $2 OR destination = $2)
            AND effective_date >= $3
            AND effective_date < $4
        ORDER BY effective_date ASC`,
        [currency, balanceId, periodStart, periodEnd]
    );

    return result.rows;
}

/**
 * Demo configuration.
 *
 * We keep the statement fully parameterized via env vars so you can generate
 * statements for any balance and any time window without editing code.
 */
const BALANCE_ID = process.env.STATEMENT_BALANCE_ID;
const CURRENCY = process.env.STATEMENT_CURRENCY || "USD";
const PERIOD_START = process.env.STATEMENT_PERIOD_START;
const PERIOD_END = process.env.STATEMENT_PERIOD_END;

async function main() {
    try {
        if (!BALANCE_ID) {
            throw new Error("STATEMENT_BALANCE_ID environment variable is required");
        }
        if (!PERIOD_START) {
            throw new Error("STATEMENT_PERIOD_START environment variable is required");
        }
        if (!PERIOD_END) {
            throw new Error("STATEMENT_PERIOD_END environment variable is required");
        }

        /** Allow a simple `--format=` flag so the demo can output CSV or PDF. */
        const formatArg = process.argv.find((arg) => arg.startsWith("--format="));
        const format = formatArg?.split("=")[1] || "csv";
        const outputFormat = format === "pdf" ? "pdf" : "csv";

        if (outputFormat !== "csv" && outputFormat !== "pdf") {
            throw new Error(`Invalid format: ${outputFormat}. Use 'csv' or 'pdf'`);
        }

        console.log("🚀 Starting Customer Statements Demo\n");
        console.log(`Balance ID: ${BALANCE_ID}`);
        console.log(`Currency: ${CURRENCY}`);
        console.log(`Period: ${PERIOD_START} to ${PERIOD_END}`);
        console.log(`Output Format: ${outputFormat.toUpperCase()}\n`);

        /**
         * Step 1: Build the statement data structure.
         *
         * We query the period’s transactions from Postgres, then ask Blnk for
         * opening/closing snapshots so balances are consistent with the ledger.
         */
        console.log("Step 1: Querying transactions from database...");
        console.log("Step 2: Fetching historical balances...");
        console.log("Step 3: Formatting data...");
        const statement = await generateStatement(BALANCE_ID, CURRENCY, PERIOD_START, PERIOD_END);
        console.log(`✅ Statement generated with ${statement.totals.transaction_count} transactions\n`);

        /**
         * Step 2: Export the statement.
         *
         * Exporters live in `resources/` so they can be reused by other demos.
         */
        console.log(`Step 4: Exporting to ${outputFormat.toUpperCase()}...`);
        let filePath: string;
        if (outputFormat === "pdf") {
            filePath = await exportCustomerStatementToPDF(statement);
        } else {
            filePath = await exportCustomerStatementToCSV(statement);
        }

        console.log(`✅ Statement exported successfully!`);
        console.log(`📄 File saved to: ${filePath}\n`);
    } catch (error: any) {
        console.error("❌ Error generating statement:", error.message);
        if (error.response) {
            console.error("API Error:", JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    } finally {
        /** Always close the shared Postgres pool after the demo completes. */
        const { db } = await import("@resources/db.ts");
        await db.end();
    }
}

main();
