/**
 * Generates a unique reference string for transactions.
 * Format: ref_{uuid}
 */
export function generateReference(): string {
    const uuid = crypto.randomUUID();
    return `ref_${uuid}`;
}
