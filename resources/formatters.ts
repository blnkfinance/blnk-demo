/**
 * Formatting utilities for statement generation
 */

/**
 * Convert amount from precise units to display units
 * @param amount - Amount in precise units (e.g., cents)
 * @param precision - Precision multiplier (e.g., 100 for USD)
 * @returns Formatted amount as string with 2 decimal places and commas
 */
export function toDisplayAmount(amount: string | number, precision: number = 100): string {
    const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    const displayAmount = numericAmount / precision;
    return displayAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/**
 * Format timestamp to readable format
 * @param timestamp - ISO 8601 timestamp string
 * @returns Formatted timestamp string (YYYY-MM-DD HH:mm:ss)
 */
export function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Determine transaction direction (DR or CR)
 * @param transaction - Transaction object with source and destination
 * @param balanceId - The balance ID to check against
 * @returns "DR" if balance is source, "CR" if balance is destination
 */
export function getDirection(
    transaction: { source: string; destination: string },
    balanceId: string
): "DR" | "CR" {
    if (transaction.source === balanceId) {
        return "DR";
    }
    if (transaction.destination === balanceId) {
        return "CR";
    }
    throw new Error(`Balance ID ${balanceId} is neither source nor destination in transaction`);
}

/**
 * Format amount to 2 decimal places with commas (without dividing by precision)
 * @param amount - Amount as string or number
 * @returns Formatted amount as string with 2 decimal places and commas
 */
export function formatAmount(amount: string | number): string {
    const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return numericAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/**
 * Get currency precision from the first transaction with the given currency
 * Falls back to 100 if no transaction found
 * @param transactions - Array of transactions to search
 * @param currency - Currency code to match
 * @returns Precision value from the first matching transaction, or 100 as default
 */
export function getCurrencyPrecision<T extends { currency: string; precision: number }>(
    transactions: T[],
    currency: string
): number {
    const transaction = transactions.find((tx) => tx.currency === currency);
    return transaction?.precision || 100;
}
