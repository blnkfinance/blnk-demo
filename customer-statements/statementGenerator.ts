import { blnk } from "@resources/blnk.ts";
import { query } from "@resources/db.ts";
import { toDisplayAmount, formatTimestamp, getDirection, getCurrencyPrecision } from "@resources/formatters.ts";

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

interface StatementTransaction {
    timestamp: string;
    reference: string;
    description: string;
    direction: "DR" | "CR";
    counterparty: string;
    amount: string;
    currency: string;
}

export interface Statement {
    balance_id: string;
    currency: string;
    account_name: string;
    period: {
        start: string;
        end: string;
    };
    opening_balance: string;
    closing_balance: string;
    totals: {
        credits: string;
        debits: string;
        transaction_count: number;
    };
    transactions: StatementTransaction[];
}

/**
 * Fetch balance details using Blnk Search API
 */
async function fetchBalanceDetails(balanceId: string): Promise<string> {
    try {
        const response = await blnk.post("/search/balances", {
            q: balanceId,
            query_by: "balance_id",
            include_fields: ["$identities(first_name,last_name)"],
        });

        const hits = response.data?.hits || [];
        if (hits.length === 0) {
            return balanceId;
        }

        const balance = hits[0].document || hits[0];
        const identity = balance.identities;

        if (identity?.first_name && identity?.last_name) {
            return `${identity.first_name} ${identity.last_name}`;
        }

        return balanceId;
    } catch (error) {
        console.warn(`Failed to fetch balance details for ${balanceId}:`, error);
        return balanceId;
    }
}

/**
 * Get counterparty balance ID from transaction
 */
function getCounterpartyId(
    transaction: Transaction,
    balanceId: string
): string {
    if (transaction.source === balanceId) {
        return transaction.destination;
    }
    if (transaction.destination === balanceId) {
        return transaction.source;
    }
    throw new Error(`Balance ID ${balanceId} is neither source nor destination in transaction`);
}

/**
 * Fetch historical balance at a specific timestamp
 */
async function fetchHistoricalBalance(
    balanceId: string,
    timestamp: string
): Promise<HistoricalBalance> {
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
 * Query transactions from database
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
        FROM transactions
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
 * Generate customer statement
 */
export async function generateStatement(
    balanceId: string,
    currency: string,
    periodStart: string,
    periodEnd: string
): Promise<Statement> {
    // Step 1: Query transactions from database
    const transactions = await queryTransactions(balanceId, currency, periodStart, periodEnd);

    if (transactions.length === 0) {
        throw new Error(
            `No transactions found for balance ${balanceId} in the specified period. ` +
            `If you have no transaction data, use the populate script first to create sample data.`
        );
    }

    // Step 2: Fetch account name and historical balances
    const accountName = await fetchBalanceDetails(balanceId);
    const periodStartBalance = await fetchHistoricalBalance(balanceId, periodStart);
    const periodEndBalance = await fetchHistoricalBalance(balanceId, periodEnd);

    // Convert balance values to numbers for calculations (handle both string and number types)
    // Opening and closing balances
    const openingBalance = typeof periodStartBalance.balance === "string" 
        ? parseFloat(periodStartBalance.balance) 
        : periodStartBalance.balance;
    const closingBalance = typeof periodEndBalance.balance === "string" 
        ? parseFloat(periodEndBalance.balance) 
        : periodEndBalance.balance;
    
    // Calculate total credits for the period
    // Credits are cumulative, so period credits = end credits - start credits
    const startCredit = typeof periodStartBalance.credit_balance === "string"
        ? parseFloat(periodStartBalance.credit_balance)
        : periodStartBalance.credit_balance;
    const endCredit = typeof periodEndBalance.credit_balance === "string"
        ? parseFloat(periodEndBalance.credit_balance)
        : periodEndBalance.credit_balance;
    const totalCredits = endCredit - startCredit;
    
    // Calculate total debits for the period
    // Debits are cumulative, so period debits = end debits - start debits
    const startDebit = typeof periodStartBalance.debit_balance === "string"
        ? parseFloat(periodStartBalance.debit_balance)
        : periodStartBalance.debit_balance;
    const endDebit = typeof periodEndBalance.debit_balance === "string"
        ? parseFloat(periodEndBalance.debit_balance)
        : periodEndBalance.debit_balance;
    const totalDebits = endDebit - startDebit;

    // Get currency precision for formatting amounts consistently throughout the statement
    const precision = getCurrencyPrecision(transactions, currency);

    // Step 3: Format transactions
    const formattedTransactions: StatementTransaction[] = [];

    for (const tx of transactions) {
        const direction = getDirection(tx, balanceId);
        const counterpartyId = getCounterpartyId(tx, balanceId);
        const counterparty = await fetchBalanceDetails(counterpartyId);

        formattedTransactions.push({
            timestamp: formatTimestamp(tx.effective_date),
            reference: tx.reference,
            description: tx.description,
            direction,
            counterparty,
            amount: toDisplayAmount(tx.amount, precision),
            currency: tx.currency,
        });
    }

    // Step 4: Build statement structure
    const statement: Statement = {
        balance_id: balanceId,
        currency,
        account_name: accountName,
        period: {
            start: periodStart,
            end: periodEnd,
        },
        opening_balance: toDisplayAmount(openingBalance, precision),
        closing_balance: toDisplayAmount(closingBalance, precision),
        totals: {
            credits: toDisplayAmount(totalCredits, precision),
            debits: toDisplayAmount(totalDebits, precision),
            transaction_count: transactions.length,
        },
        transactions: formattedTransactions,
    };

    return statement;
}
